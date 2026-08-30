from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal, TextIO

import pyarrow as pa
import pyarrow.parquet as pq

from nutrition_ingest.common.schema import (
    BRANDED_FIELD_DEFINITIONS,
    CORE_FOOD_FIELDS,
    SCHEMA_VERSION,
)
from nutrition_ingest.common.validation import (
    ValidationIssue,
    safe_json_value,
    validate_normalized_row,
)
from nutrition_ingest.parsers import merge_off_branded, normalize_raw

INPUT_DIRECTORY = Path("data/inputs")
OUTPUT_DIRECTORY = Path("data/outputs/v2")
CATALOG_PARQUET = OUTPUT_DIRECTORY / "foods.parquet"
RELEASE_MANIFEST = OUTPUT_DIRECTORY / "manifest.json"
REJECTS_JSONL = OUTPUT_DIRECTORY / "rejects.jsonl"
PARQUET_BATCH_SIZE = 10_000
MAX_REJECTED_ROWS = 100
MAX_REJECTED_FRACTION = 0.001
MINIMUM_SOURCE_COVERAGE: dict[str, dict[str, float]] = {
    "usda_fooddata_central_survey": {"calories": 0.99, "vitamin_b6": 0.99},
    "usda_fooddata_central_foundation": {"calories": 0.85, "vitamin_b6": 0.50},
    "usda_fooddata_central_sr_legacy": {"calories": 0.99, "vitamin_b6": 0.90},
}

DatasetKind = Literal["raw", "branded"]


@dataclass
class DatasetReport:
    scanned: int = 0
    emitted: int = 0
    rejected: int = 0
    contract_errors: int = 0
    reasons: Counter[str] = field(default_factory=Counter)
    coverage: dict[str, Counter[str]] = field(default_factory=lambda: defaultdict(Counter))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_metadata() -> dict[str, Any]:
    commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    dirty = bool(
        subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=no"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
    )
    return {"commit": commit, "dirty": dirty}


def _parquet_schema() -> pa.Schema:
    portion = pa.struct(
        [
            pa.field("name", pa.string(), nullable=False),
            pa.field("amount", pa.float64(), nullable=False),
            pa.field("unit", pa.string(), nullable=False),
        ]
    )
    fields = [pa.field("dataset_kind", pa.string(), nullable=False)]
    for field_name in CORE_FOOD_FIELDS:
        if field_name in {"source_id", "source", "name"}:
            fields.append(pa.field(field_name, pa.string(), nullable=False))
        elif field_name == "portions":
            fields.append(pa.field(field_name, pa.list_(portion)))
        else:
            fields.append(pa.field(field_name, pa.float64()))
    for definition in BRANDED_FIELD_DEFINITIONS:
        fields.append(pa.field(definition.name, pa.string()))
    return pa.schema(fields)


def _rejection_record(
    kind: DatasetKind,
    row: dict[str, Any],
    issues: list[ValidationIssue],
) -> dict[str, Any]:
    return {
        "dataset_kind": kind,
        "source": row.get("source"),
        "source_id": row.get("source_id"),
        "name": row.get("name"),
        "reason_codes": sorted({issue.code for issue in issues}),
        "errors": [issue.as_dict() for issue in issues],
        "row": safe_json_value(row),
    }


def _update_coverage(report: DatasetReport, row: dict[str, Any]) -> None:
    source = str(row.get("source") or "unknown")
    report.coverage[source]["__rows__"] += 1
    for field_name in CORE_FOOD_FIELDS:
        if row.get(field_name) is not None:
            report.coverage[source][field_name] += 1


def _enforce_quality(report: DatasetReport) -> None:
    for source, thresholds in MINIMUM_SOURCE_COVERAGE.items():
        fields = report.coverage.get(source)
        if not fields or fields["__rows__"] < 100:
            continue
        for field_name, minimum in thresholds.items():
            if fields[field_name] / fields["__rows__"] < minimum:
                report.contract_errors += 1
                report.reasons[f"coverage_below_minimum:{source}:{field_name}"] += 1

    rejected_fraction = report.rejected / report.scanned if report.scanned else 0.0
    if report.contract_errors:
        raise RuntimeError(
            f"Catalog failed validation with {report.contract_errors} contract error(s)"
        )
    if report.rejected > MAX_REJECTED_ROWS or rejected_fraction > MAX_REJECTED_FRACTION:
        raise RuntimeError(
            "Catalog failed quality gate: "
            f"rejected={report.rejected}/{report.scanned} ({rejected_fraction:.3%}), "
            f"limits={MAX_REJECTED_ROWS} rows/{MAX_REJECTED_FRACTION:.3%}"
        )


def _write_rows(
    writer: pq.ParquetWriter,
    rows: Iterable[dict[str, Any]],
    kind: DatasetKind,
    rejects_handle: TextIO,
    logical_digest: Any,
    schema: pa.Schema,
) -> DatasetReport:
    report = DatasetReport()
    batch: list[dict[str, Any]] = []
    for row in rows:
        report.scanned += 1
        issues = validate_normalized_row(row, branded=kind == "branded")
        if issues:
            report.rejected += 1
            report.contract_errors += sum(issue.kind == "contract" for issue in issues)
            report.reasons.update(issue.code for issue in issues)
            rejects_handle.write(
                json.dumps(
                    _rejection_record(kind, row, issues),
                    ensure_ascii=False,
                    allow_nan=False,
                )
                + "\n"
            )
        else:
            catalog_row = {
                "dataset_kind": kind,
                **row,
                "brand": row.get("brand"),
                "gtin": row.get("gtin"),
            }
            ordered_row = {field_name: catalog_row.get(field_name) for field_name in schema.names}
            logical_digest.update(
                (
                    json.dumps(
                        ordered_row,
                        ensure_ascii=False,
                        allow_nan=False,
                        separators=(",", ":"),
                    )
                    + "\n"
                ).encode()
            )
            batch.append(ordered_row)
            report.emitted += 1
            _update_coverage(report, row)
            if len(batch) == PARQUET_BATCH_SIZE:
                writer.write_table(pa.Table.from_pylist(batch, schema=schema))
                batch.clear()
        if report.scanned % PARQUET_BATCH_SIZE == 0:
            print(
                f"Mons nutrition: {kind} scanned={report.scanned:,} "
                f"emitted={report.emitted:,} rejected={report.rejected:,}",
                file=sys.stderr,
            )
    if batch:
        writer.write_table(pa.Table.from_pylist(batch, schema=schema))
    _enforce_quality(report)
    return report


def write_catalog_parquet(
    raw_rows: Iterable[dict[str, Any]],
    branded_rows: Iterable[dict[str, Any]],
    parquet_path: Path,
    rejects_path: Path,
) -> tuple[dict[DatasetKind, DatasetReport], str]:
    schema = _parquet_schema()
    logical_digest = hashlib.sha256()
    writer = pq.ParquetWriter(parquet_path, schema, compression="zstd")
    try:
        with rejects_path.open("w", encoding="utf-8", newline="\n") as rejects_handle:
            reports: dict[DatasetKind, DatasetReport] = {
                "raw": _write_rows(
                    writer,
                    raw_rows,
                    "raw",
                    rejects_handle,
                    logical_digest,
                    schema,
                ),
                "branded": _write_rows(
                    writer,
                    branded_rows,
                    "branded",
                    rejects_handle,
                    logical_digest,
                    schema,
                ),
            }
    finally:
        writer.close()
    return reports, logical_digest.hexdigest()


def _input_files(paths: list[Path]) -> list[Path]:
    files: set[Path] = set()
    for path in paths:
        if path.is_file():
            files.add(path)
        else:
            files.update(candidate for candidate in path.rglob("*") if candidate.is_file())
    return sorted(files)


def _source_records(paths: list[Path], inputs_dir: Path) -> list[dict[str, Any]]:
    records = []
    for path in _input_files(paths):
        try:
            local_path = path.relative_to(Path.cwd())
            path.relative_to(inputs_dir)
        except ValueError as exc:
            raise RuntimeError(f"Build input is outside {inputs_dir}: {path}") from exc
        records.append(
            {
                "path": str(local_path),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )
    return records


def _coverage(report: DatasetReport) -> dict[str, dict[str, int]]:
    return {
        source: dict(sorted(fields.items())) for source, fields in sorted(report.coverage.items())
    }


def _release_id(logical_hash: str, built_at: datetime) -> str:
    content = f"{SCHEMA_VERSION}\n{logical_hash}\n".encode()
    return f"{built_at:%Y-%m-%d}-{hashlib.sha256(content).hexdigest()[:8]}"


def build_release(
    *,
    inputs_dir: Path = INPUT_DIRECTORY,
    output_dir: Path = OUTPUT_DIRECTORY,
) -> dict[str, Any]:
    inputs_dir = inputs_dir.resolve()
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    built_at = datetime.now(UTC)

    raw_paths = normalize_raw.build_default_paths(inputs_dir)
    for label, path in raw_paths.items():
        if not path.exists():
            raise RuntimeError(f"Missing required input for {label.replace('_', ' ')}: {path}")
    branded_paths = {
        "usda_branded": inputs_dir / "FoodData_Central_branded_food_json_2025-12-18.json",
        "off_parquet": inputs_dir / "food.parquet",
        "nutrient_csv": inputs_dir / "FoodData_Central_csv_2025-04-24" / "nutrient.csv",
    }
    for label, path in branded_paths.items():
        if not path.is_file():
            raise RuntimeError(f"Missing required input for {label.replace('_', ' ')}: {path}")

    with tempfile.TemporaryDirectory(prefix=".mons-build-", dir=output_dir.parent) as directory:
        workspace = Path(directory)
        candidate_parquet = workspace / CATALOG_PARQUET.name
        candidate_manifest = workspace / RELEASE_MANIFEST.name
        candidate_rejects = workspace / REJECTS_JSONL.name

        raw_rows = normalize_raw.enforce_unique_names(
            normalize_raw.enforce_display_safety(normalize_raw.iter_rows(raw_paths))
        )
        branded_rows = merge_off_branded.iter_rows(
            branded_paths["usda_branded"],
            branded_paths["off_parquet"],
            branded_paths["nutrient_csv"],
        )
        reports, logical_hash = write_catalog_parquet(
            raw_rows,
            branded_rows,
            candidate_parquet,
            candidate_rejects,
        )
        all_inputs = [*raw_paths.values(), *branded_paths.values()]
        manifest = {
            "manifest_version": 1,
            "status": "success",
            "release_id": _release_id(logical_hash, built_at),
            "schema_version": SCHEMA_VERSION,
            "built_at": built_at.isoformat(),
            "git": _git_metadata(),
            "sources": _source_records(all_inputs, inputs_dir),
            "counts": {
                "raw": reports["raw"].emitted,
                "branded": reports["branded"].emitted,
                "rejected": reports["raw"].rejected + reports["branded"].rejected,
            },
            "rejection_reasons": {
                kind: dict(sorted(report.reasons.items())) for kind, report in reports.items()
            },
            "coverage": {kind: _coverage(report) for kind, report in reports.items()},
            "logical_sha256": logical_hash,
            "artifact": {
                "filename": candidate_parquet.name,
                "bytes": candidate_parquet.stat().st_size,
                "sha256": sha256_file(candidate_parquet),
            },
        }
        with candidate_manifest.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(manifest, handle, ensure_ascii=False, allow_nan=False, indent=2)
            handle.write("\n")

        output_dir.mkdir(parents=True, exist_ok=True)
        for source, target in (
            (candidate_parquet, output_dir / candidate_parquet.name),
            (candidate_manifest, output_dir / candidate_manifest.name),
            (candidate_rejects, output_dir / candidate_rejects.name),
        ):
            os.replace(source, target)

        for legacy_name in (
            "raw-foods.jsonl",
            "branded-foods.jsonl",
            "raw-foods.jsonl.zst",
            "branded-foods.jsonl.zst",
            "raw-foods.parquet",
            "branded-foods.parquet",
            "raw-foods.manifest.json",
            "branded-foods.manifest.json",
            "raw-foods.rejected.jsonl",
            "branded-foods.rejected.jsonl",
        ):
            (output_dir / legacy_name).unlink(missing_ok=True)
        legacy_rejects = output_dir / "rejects"
        for legacy_name in ("raw-foods.jsonl", "branded-foods.jsonl"):
            (legacy_rejects / legacy_name).unlink(missing_ok=True)
        if legacy_rejects.is_dir() and not any(legacy_rejects.iterdir()):
            legacy_rejects.rmdir()

    return manifest


def register_subparsers(subparsers) -> None:
    build = subparsers.add_parser("build", help="Build the complete local Mons nutrition release")
    build.add_argument("--inputs-dir", type=Path, default=INPUT_DIRECTORY)
    build.add_argument("--output-dir", type=Path, default=OUTPUT_DIRECTORY)
    build.set_defaults(handler=_run_build)


def _run_build(args) -> None:
    manifest = build_release(inputs_dir=args.inputs_dir, output_dir=args.output_dir)
    print(json.dumps({"release_id": manifest["release_id"]}, indent=2))
