#!/usr/bin/env python
import argparse
from dataclasses import dataclass
import json
import logging
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
import yaml

logger = logging.getLogger(__name__)


def toc_from_html(url: str) -> list[tuple[str, str]]:
    response = requests.get(url)
    soup = BeautifulSoup(response.content, features="html.parser")
    toc = soup.find(id="bd-docs-nav")
    if not toc:
        toc = soup.find(class_="bd-docs-nav")
    links = [(a["href"], a.get_text(strip=True)) for a in toc.find_all("a", href=True)]
    return links


@dataclass
class CatalogItem:
    html_url: str
    code_url: str
    release: str
    toc_path: str


def make_external_url(item: CatalogItem, path: str) -> str:
    # Output should be like:
    # * \https://github.com/**ORGANIZATION**/**REPOSITORY**/blob/**TAG**/path/to/file.md
    # * \https://gitlab.domainname.tld/**GROUP**/**PROJECT**/-/blob/**TAG**/path/to/file.md
    # * \https://gitlab.domainname.tld/**GROUP**/**SUBGROUP**/**PROJECT**/blob/**TAG**/path/to/file.md
    if Path(path).suffix == "":
        # TODO goto code repo and find file including a suffix
        # instead of assuming .md
        path = f"{path}.md"
    path = item.toc_path.replace("_toc.yml", path)
    if "github.com" in item.code_url:
        return f"{item.code_url}/blob/{item.release}/{path}"
    elif "gitlab" in item.code_url:
        if item.code_url.count("/") > 4:
            # Has subgroup
            return f"{item.code_url}/blob/{item.release}/{path}"
        return f"{item.code_url}/-/blob/{item.release}/{path}"
    else:
        raise NotImplementedError("Only GitHub and GitLab")


def make_download_url(code_url: str, release: str, path: str) -> str:
    # Output should be like:
    # * https://github.com/TeachBooks/manual/raw/refs/tags/v1.1.1/book/intro.md
    # * https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/raw/v0.1/book/intro.md
    if "github.com" in code_url:
        if release == "main":
            return f"{code_url}/raw/refs/heads/main/{path}"
        return f"{code_url}/raw/refs/tags/{release}/{path}"
    elif "gitlab" in code_url:
        if code_url.count("/") > 4:
            # Has subgroup
            return f"{code_url}/raw/{release}/{path}"
        return f"{code_url}/-/raw/{release}/{path}"
    else:
        raise NotImplementedError("Only GitHub and GitLab")


def toc_from_code(item: CatalogItem):
    url = make_download_url(item.code_url, item.release, item.toc_path)
    response = requests.get(url)
    toc = yaml.load(response.content, Loader=yaml.Loader)
    # For structure of toc see https://jupyterbook.org/en/stable/structure/toc.html
    return toc


@dataclass
class Config:
    title: str
    logo: str
    author: str


def config_from_code(item: CatalogItem) -> Config:
    config_path = item.toc_path.replace("_toc.yml", "_config.yml")
    url = make_download_url(item.code_url, item.release, config_path)
    response = requests.get(url)
    config = yaml.load(response.content, Loader=yaml.Loader)
    if "logo" in config:
        rel_logo = item.toc_path.replace("_toc.yml", config["logo"])
        logo = make_download_url(item.code_url, item.release, rel_logo)
    else:
        rel_logo = config["sphinx"]["config"]["html_theme_options"]["logo"][
            "image_light"
        ]
        static_path = config["sphinx"]["config"]["html_static_path"][0]
        abs_static_path = item.toc_path.replace("_toc.yml", static_path)
        logo = make_download_url(
            item.code_url, item.release, f"{abs_static_path}/{rel_logo}"
        )
    return Config(title=config["title"], logo=logo, author=config["author"])


@dataclass
class TocEntry:
    title: str
    children: list["TocEntry"]
    html_url: str | None = None
    external_url: str | None = None


@dataclass
class CatalogItemWithToc(CatalogItem, Config):
    toc: TocEntry


def find_title(file: str, toc_html: list[tuple[str, str]]) -> tuple[str, str]:
    html_path = quote(str(Path(file).with_suffix(".html")))
    if file == "#":
        html_path = file
    for path, title in toc_html:
        if html_path == path:
            return title, path
    raise ValueError(f"Title not found for '{file}'")


def content_entry(
    item: CatalogItem, entry: dict, toc_html: list[tuple[str, str]], root_html_url: str
) -> TocEntry:
    if "file" in entry:
        title, html_url = find_title(entry["file"], toc_html)
        return TocEntry(
            title=title,
            html_url=root_html_url + html_url,
            external_url=make_external_url(item, entry["file"]),
            children=[],
        )
    elif "url" in entry and "title" in entry:
        return TocEntry(
            title=entry["title"],
            html_url=entry["url"],
            children=[],
        )
    elif "external" in entry:
        raise NotImplementedError("External content not supported")
    else:
        raise ValueError(f"Unknown type of content entry: {entry}")


def merge_tocs(item: CatalogItem, toc_yml, toc_html: list[tuple[str, str]]):
    root_path = item.toc_path.replace("_toc.yml", toc_yml["root"])
    root_html_url = item.html_url.replace(
        str(Path(toc_yml["root"]).with_suffix(".html")), ""
    )
    root_code_url = make_external_url(item, root_path)
    toc = TocEntry(
        title="", html_url=item.html_url, external_url=root_code_url, children=[]
    )
    if "parts" in toc_yml:
        for part in toc_yml["parts"]:
            part_toc = TocEntry(title=part["caption"], children=[])
            toc.children.append(part_toc)
            for chapter in part["chapters"]:
                chapter_toc = content_entry(item, chapter, toc_html, root_html_url)
                part_toc.children.append(chapter_toc)
                if "sections" in chapter:
                    for section in chapter["sections"]:
                        try:
                            section_toc = content_entry(
                                item, section, toc_html, root_html_url
                            )
                            chapter_toc.children.append(section_toc)
                        except ValueError:
                            section_toc = chapter_toc
                        if "sections" in section:
                            for subsection in section["sections"]:
                                subsection_toc = content_entry(
                                    item, subsection, toc_html, root_html_url
                                )
                                section_toc.children.append(subsection_toc)
                                if "section" in subsection:
                                    for subsubsection in subsection["sections"]:
                                        subsubsection_toc = content_entry(
                                            item, subsubsection, toc_html, root_html_url
                                        )
                                        subsection_toc.children.append(
                                            subsubsection_toc
                                        )

    else:
        for chapter in toc_yml["chapters"]:
            chapter_toc = content_entry(item, chapter, toc_html, root_html_url)
            toc.children.append(chapter_toc)
            if "sections" in chapter:
                for section in chapter["sections"]:
                    section_toc = content_entry(item, section, toc_html, root_html_url)
                    chapter_toc.children.append(section_toc)

    return toc


def enrich_catalog_item(item: CatalogItem):
    toc_yml = toc_from_code(item)
    toc_html = toc_from_html(item.html_url)
    config = config_from_code(item)
    toc = merge_tocs(item=item, toc_yml=toc_yml, toc_html=toc_html)
    if config.title == "Template":
        config.title = item.code_url.split("/")[-1]
    if toc.title == "":
        toc.title = config.title
    return CatalogItemWithToc(toc=toc, **item.__dict__, **config.__dict__)


def main():
    parser = argparse.ArgumentParser(
        prog="harvest", description="Harvest toc catalog items"
    )
    parser.add_argument(
        "--catalog", type=Path, help="Path to catalog file", default="books.yml"
    )
    parser.add_argument(
        "--output", "-o", type=Path, help="Path to output file", default="chapters.json"
    )

    args = parser.parse_args()

    with open(args.catalog) as f, open(args.output, "w") as f_out:
        catalog = yaml.load(f, Loader=yaml.Loader)
        items = []
        for catalog_item in catalog:
            logger.warning(f"Processing {catalog_item['html_url']}")
            item = enrich_catalog_item(CatalogItem(**catalog_item))
            items.append(item)
        json.dump(items, f_out, indent=2, default=lambda dc: dc.__dict__)


if __name__ == "__main__":
    main()
