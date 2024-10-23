# /// script
# requires-python = ">=3.9"
# dependencies = [
#   "PyYAML",
# ]
# ///

import os.path

from argparse import ArgumentParser
from pathlib import Path
from typing import Any, Callable, Dict, Union
from urllib.parse import urlparse

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


def parse_toc_yaml(
        path: Union[str, Path], encoding: str = "utf8"
) -> Dict[str, Any]:
    """Parse the ToC file.

    :param path: `_toc.yml` file path
    :param encoding: `_toc.yml` file character encoding
    :return: parsed site map
    """
    with Path(path).open(encoding=encoding) as handle:
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
    with Path(path).open(encoding=encoding, mode="w") as handle:
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


def parse_external_url(url: str) -> Dict[str, str]:
    """ Parse the URL to external content.

    :param url: URL path to the external content
    :return: fields extracted from the URL
    """
    parsed = urlparse(url)
    repo, others = parsed.path.split("/blob/")
    repo = repo.rstrip("/-")  # gitlab has an additional "/-" in the URL
    *_, name = repo.split("/")
    revision, path = others.split("/", 1)
    return dict(
        repo_name=name,
        repo_url=f"https://{parsed.netloc}{repo}",
        file_path=path,
        revision=revision,
    )


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
    kw = parse_external_url(external_url)
    repo_name = "-".join([kw["repo_name"],  kw["revision"]])

    # TODO: here is where cloning external repos should happen ...
    print(f"Cloning {kw['repo_url']} to {external_path}/{repo_name} ...")

    rel_path = get_relative_path(external_path, root)
    repo_path = os.path.join(rel_path, repo_name)
    mapping_local["file"] = os.path.join(repo_path, kw["file_path"])
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
