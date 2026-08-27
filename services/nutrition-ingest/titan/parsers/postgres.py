from __future__ import annotations

import json
from pathlib import Path

from titan.common.paths import BRANDED_FOODS_OUTPUT, RAW_FOODS_OUTPUT
from titan.common.postgres import ingest, status


def register_subparser(subparsers) -> None:
    parser = subparsers.add_parser("postgres", help="Inspect or ingest the local Mons PostgreSQL database")
    commands = parser.add_subparsers(dest="postgres_command", required=True)

    status_parser = commands.add_parser("status", help="Show local database status")
    status_parser.add_argument("--database-url", help="PostgreSQL connection URL (default: DATABASE_URL or local Compose URL)")
    status_parser.add_argument("--schema", default="mons", help="Active schema (default: mons)")
    status_parser.set_defaults(handler=run_status)

    ingest_parser = commands.add_parser("ingest", help="Atomically ingest validated raw and branded JSONL")
    ingest_parser.add_argument("--raw", type=Path, default=RAW_FOODS_OUTPUT)
    ingest_parser.add_argument("--branded", type=Path, default=BRANDED_FOODS_OUTPUT)
    ingest_parser.add_argument("--raw-manifest", type=Path)
    ingest_parser.add_argument("--branded-manifest", type=Path)
    ingest_parser.add_argument("--database-url", help="PostgreSQL connection URL (default: DATABASE_URL or local Compose URL)")
    ingest_parser.add_argument("--schema", default="mons", help="Active schema (default: mons)")
    ingest_parser.set_defaults(handler=run_ingest)


def run_status(args) -> None:
    print(json.dumps(status(args.database_url, active_schema=args.schema), indent=2))


def run_ingest(args) -> None:
    result = ingest(
        raw_path=args.raw,
        branded_path=args.branded,
        raw_manifest_path=args.raw_manifest,
        branded_manifest_path=args.branded_manifest,
        database_url=args.database_url,
        active_schema=args.schema,
    )
    print(json.dumps(result, indent=2))
