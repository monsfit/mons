from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from dotenv import dotenv_values

from nutrition_ingest import r2, release
from nutrition_ingest.common.postgres import status


def _run_status(args) -> None:
    print(json.dumps(status(args.database_url, active_schema=args.schema), indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nutrition-ingest",
        description="Build, publish, and load the Mons nutrition catalog.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    release.register_subparsers(subparsers)
    r2.register_subparsers(subparsers)
    status_parser = subparsers.add_parser("status", help="Show the active PostgreSQL catalog")
    status_parser.add_argument("--database-url", help="PostgreSQL migration connection URL")
    status_parser.add_argument(
        "--schema", default="mons_catalog", help="Active schema (default: mons_catalog)"
    )
    status_parser.set_defaults(handler=_run_status)

    return parser


def main(argv: list[str] | None = None) -> None:
    repository = Path(__file__).resolve().parents[3]
    file_values: dict[str, str] = {}
    for filename in (".env", ".env.local"):
        file_values.update(
            {
                key: value
                for key, value in dotenv_values(repository / filename).items()
                if value is not None
            }
        )
    for key, value in file_values.items():
        os.environ.setdefault(key, value)

    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "handler"):
        parser.error("Missing command handler")
    args.handler(args)


if __name__ == "__main__":
    main()
