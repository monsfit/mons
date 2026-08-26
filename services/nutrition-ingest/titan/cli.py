from __future__ import annotations

import argparse

from titan import schema_contracts
from titan.parsers import (
    australia,
    canada,
    cofid,
    merge_off_branded,
    nevo,
    new_zealand,
    normalize_raw,
    postgres,
    usda,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="titan",
        description="Normalize multiple food composition datasets into a common JSONL schema.",
    )
    subparsers = parser.add_subparsers(dest="source", required=True)

    australia.register_subparser(subparsers)
    canada.register_subparser(subparsers)
    cofid.register_subparser(subparsers)
    nevo.register_subparser(subparsers)
    new_zealand.register_subparser(subparsers)
    usda.register_subparser(subparsers)
    normalize_raw.register_subparser(subparsers)
    merge_off_branded.register_subparser(subparsers)
    postgres.register_subparser(subparsers)
    schema_contracts.register_subparser(subparsers)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "handler"):
        parser.error("Missing source parser handler")
    args.handler(args)


if __name__ == "__main__":
    main()
