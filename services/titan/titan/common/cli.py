from __future__ import annotations

from pathlib import Path
from typing import Any

from titan.common.paths import OUTPUT_DIRECTORY


def resolve_output_path(output_arg: str | None, source_name: str) -> Path | None:
    if output_arg is None or output_arg == "":
        return OUTPUT_DIRECTORY / f"{source_name}.jsonl"
    if output_arg == "-":
        return None
    return Path(output_arg)


def add_quality_output_arguments(parser, *, source_name: str) -> None:
    default_output = OUTPUT_DIRECTORY / f"{source_name}.jsonl"
    parser.add_argument(
        "--output",
        default=None,
        help=f"Output JSONL path (default: {default_output}, use '-' for stdout)",
    )
    parser.add_argument("--rejects", help="Rejected-row JSONL path (default: output sibling)")
    parser.add_argument("--manifest", help="Run manifest JSON path (default: output sibling)")
    parser.add_argument("--max-rejected-rows", type=int, default=100)
    parser.add_argument("--max-rejected-fraction", type=float, default=0.001)
    parser.add_argument("--progress-every", type=int, default=10000)


def output_options(args: Any) -> dict[str, Any]:
    return {
        "rejects_path": Path(args.rejects) if getattr(args, "rejects", None) else None,
        "manifest_path": Path(args.manifest) if getattr(args, "manifest", None) else None,
        "max_rejected_rows": int(getattr(args, "max_rejected_rows", 100)),
        "max_rejected_fraction": float(getattr(args, "max_rejected_fraction", 0.001)),
        "progress_every": int(getattr(args, "progress_every", 10000)),
    }
