# /// script
# dependencies = [
#   "PyYAML",
# ]
# ///

import os.path
import re
import subprocess

from argparse import ArgumentParser
from pathlib import Path
from typing import Any, Callable, Dict, Union

import yaml


DEFAULT_IN_TOC_FILE = "_toc.yml"
DEFAULT_OUT_TOC_FILE = "_toc.local.yml"
DEFAULT_EXTERNAL_PATH = "external"


def parse_args():
    parser = ArgumentParser()
    parser.add_argument(
        "-i", "--input", help="Input ToC file", default=DEFAULT_IN_TOC_FILE
    )
    parser.add_argument(
        "-o", "--output", help="Output ToC file", default=DEFAULT_OUT_TOC_FILE
    )
    parser.add_argument(
        "-p", "--external-path", help="Root path of the external resources",
        default=DEFAULT_EXTERNAL_PATH
    )
    return vars(parser.parse_args())


def get_repo_url(url: str) -> str:
    """Get repo url by searching for reg like https://*/*/*/

    :param url: URL path to the external content
    :return: repository URL
    """
    pattern = r"https://[^/]+/[^/]+/[^/]+(?=/)"
    match = re.search(pattern, url)
    return match[0]


def get_branch_tag_name(url: str) -> str:
    """Get branch_tag_name by searching for anything between blob and book in
    exeternal_url

    :param url: URL path to the external content
    :return: branch or tag name
    """
    pattern = r"blob/([^/]+)/"
    match = re.search(pattern, url)
    return match[1]


def get_content_path(url: str) -> str:
    """Get relative path of the external content from the URL path

    :param url: URL path to the external content
    :return: repo path to the external content
    """
    branch_tag_name = get_branch_tag_name(url)
    *_, path = url.split(branch_tag_name)
    return path.strip("/")  # remove leading and trailing "/"


def create_content_dir_name(url: str, root_dir: Union[str, Path]) -> str:
    """Generate the path where the repo will be cloned to.

    It will be of the form:

    {root_path}/{platform}_{organization}_{repository}/{revision}

    :param url: URL path to the external content
    :param root_dir: root directory where the repo will be cloned into
    :return: path where the repo will be cloned to
    """
    branch_tag_name = get_branch_tag_name(url)
    url = get_repo_url(url)
    if url.startswith("https://"):
        url = url.removeprefix("https://")
    dir_name = url.replace("/", "_")
    return f"{root_dir}/{dir_name}/{branch_tag_name}"


def parse_toc_yaml(
        path: Union[str, Path], encoding: str = "utf8"
) -> Dict[str, Any]:
    """Parse the ToC file.

    :param path: `_toc.yml` file path
    :param encoding: `_toc.yml` file character encoding
    :return: parsed site map
    """
    with open(path, encoding=encoding) as handle:
        data = yaml.safe_load(handle)
    return data


def write_toc_yaml(
        data: Dict[str, str], path: Union[str, Path], encoding: str = "utf8"
) -> None:
    """ Write a ToC file.

    :param data: site map
    :param path: `_toc.yml` file path
    :param encoding: `_toc.yml` file character encoding
    """
    with open(path, encoding=encoding, mode="w") as handle:
        yaml.safe_dump(data, handle)


def get_root_path(toc_path: Union[str, Path], root: Union[str, Path]) -> str:
    """ Determine path to the root file.

    :param path: path to the ToC file
    :param root: relative root path from the ToC file
    :return: root path
    """
    toc_dir = os.path.dirname(toc_path)
    return os.path.join(toc_dir, root)


def get_relative_path(path: Union[str, Path], root: Union[str, Path]) -> str:
    """ Determine path relative to the root file.

    :param path: path to transform
    :param root: root file path
    :return: relative path
    """
    return os.path.relpath(path, os.path.dirname(root))


def external_to_local(
        mapping: Dict[str, Any], external_path: Union[str, Path],
        root: Union[str, Path]
) -> Dict[str, Any]:
    """ Modify mapping with the "external" key.

    Retrieve external components locally, and fix ToC fields accordingly.

    :param mapping: map to modify
    :param external_path: path where to store external components
    :param root: express paths to external components with respect to root
    :return: map with fields adjusted in order to refer to local resources
    """
    mapping_local = mapping.copy()
    external_url = mapping_local.pop("external")

    repo_url = get_repo_url(external_url)
    clone_url = f"{repo_url}.git"

    branch_tag_name = get_branch_tag_name(external_url)
    content_dir = create_content_dir_name(external_url, root_dir=external_path)

    # clone with branch_name
    subprocess.run([
        "git", "clone", "--single-branch", "-b",  branch_tag_name, clone_url,
        content_dir
    ])

    content_path = get_content_path(external_url)
    rel_path = get_relative_path(content_dir, root)
    mapping_local["file"] = os.path.join(rel_path, content_path)
    return mapping_local


def modify_field(data: Any, key: str, func: Callable, *args, **kwargs) -> Any:
    """ Modify the fields that match a given key.

    Recursively look for the fields matching a given key in a YAML-like
    mapping. Modify the matching fields by running `func` on them.

    :param data: mapping where to look for matches
    :param key: key to look for
    :param func: function to run on the matching fields
    :param args, kwargs: other positional and keyword arguments for `func`
    :return: modified mapping
    """
    if isinstance(data, dict):
        if key in data:
            return func(data, *args, **kwargs)
        else:
            return {
                k: modify_field(v, key, func, *args, **kwargs)
                for k, v in data.items()
            }
    elif isinstance(data, list):
        return [modify_field(el, key, func, *args, **kwargs) for el in data]
    return data


def main() -> None:
    args = parse_args()

    # parse input ToC file
    data = parse_toc_yaml(args["input"])

    # we need to adjust the book root path depending on the (new) ToC file path
    root_in = get_root_path(args["input"], data["root"])
    root_out = get_relative_path(root_in, args["output"])
    data_local = data.copy()
    data_local.update({"root": root_out})

    # recursively modify all "external" fields
    data_local = modify_field(
        data_local, key="external", func=external_to_local,
        external_path=args["external_path"], root=root_out,
    )

    # save new ToC file, done!
    write_toc_yaml(data_local, args["output"])


if __name__ == "__main__":
    main()
