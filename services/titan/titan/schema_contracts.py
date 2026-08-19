from __future__ import annotations

import json
from pathlib import Path

from titan.common.schema import branded_food_json_schema, raw_food_json_schema

DEFAULT_OUTPUT_DIRECTORY = Path("packages/contracts/schema")


def _payload(schema: dict) -> str:
    return f"{json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True)}\n"


def write_schemas(output_directory: Path) -> tuple[Path, Path]:
    output_directory.mkdir(parents=True, exist_ok=True)
    raw_path = output_directory / "raw-food-v2.schema.json"
    branded_path = output_directory / "branded-food-v2.schema.json"
    raw_path.write_text(_payload(raw_food_json_schema()), encoding="utf-8", newline="\n")
    branded_path.write_text(_payload(branded_food_json_schema()), encoding="utf-8", newline="\n")
    return raw_path, branded_path


def check_schemas(output_directory: Path) -> tuple[Path, Path]:
    paths_and_payloads = (
        (output_directory / "raw-food-v2.schema.json", _payload(raw_food_json_schema())),
        (output_directory / "branded-food-v2.schema.json", _payload(branded_food_json_schema())),
    )
    stale = [
        path
        for path, payload in paths_and_payloads
        if not path.is_file() or path.read_text() != payload
    ]
    if stale:
        joined = ", ".join(str(path) for path in stale)
        raise RuntimeError(f"Generated JSON Schemas are stale: {joined}")
    return paths_and_payloads[0][0], paths_and_payloads[1][0]


def register_subparser(subparsers) -> None:
    parser = subparsers.add_parser(
        "schema",
        help="Generate deterministic raw and branded JSON Schemas",
    )
    parser.add_argument(
        "--output-directory",
        type=Path,
        default=DEFAULT_OUTPUT_DIRECTORY,
        help=f"Schema output directory (default: {DEFAULT_OUTPUT_DIRECTORY})",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify checked-in schemas without writing files",
    )
    parser.set_defaults(handler=run_from_args)


def run_from_args(args) -> None:
    paths = (
        check_schemas(args.output_directory)
        if args.check
        else write_schemas(args.output_directory)
    )
    for path in paths:
        print(path)
