"""Build external conetnt"""
from pathlib import Path
import subprocess
import re

external_urls = [
    "https://github.com/EXCITED-CO2/workshop_tutorial/blob/v1.0.0/book/ARCO-ERA5.ipynb",  # with tag
    "https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/book/intro.md",  # from gitlab
    ]

# Note: git clone doesnot work for the commit with --branch option

def get_repo_url(url):
    """Get url by searching for reg like https://*/*/*/"""
    pattern = r"https://[^/]+/[^/]+/[^/]+(?=/)"
    match = re.search(pattern, url)
    return match[0]


def get_branch_tag_name(url):
    """Get branch_tag_name by searching for anthing between blob and book in
    exeternal_url"""
    pattern = r"blob/([^/]+)/"
    match = re.search(pattern, url)
    return match[1]


def create_content_dir_name(url):
    branch_tag_name = get_branch_tag_name(url)

    url = get_repo_url(url)
    if url.startswith("https://"):
        url = url.removeprefix("https://")
    dir_name = url.replace("/", "_")

    root_dir = Path("book/external")
    return f"{root_dir}/{dir_name}/{branch_tag_name}"


for external_url in external_urls:
    repo_url = get_repo_url(external_url)
    clone_url = f"{repo_url}.git"

    branch_tag_name = get_branch_tag_name(external_url)

    content_dir = create_content_dir_name(external_url)
    print(content_dir)

    # clone with branch_name
    subprocess.run(["git", "clone", "--single-branch", "-b",  branch_tag_name, clone_url, content_dir])

# TODO: install requirements.txt

# build the book
toc_path = Path("book/_toc_valid.yml").resolve()
subprocess.run(["jupyter-book", "build", "--toc", toc_path, "book"])
