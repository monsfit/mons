from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from titan.common.schema import CORE_FOOD_FIELDS, SCHEMA_VERSION
from titan.common.validation import ValidationIssue, safe_json_value, validate_normalized_row

MINIMUM_SOURCE_COVERAGE: dict[str, dict[str, float]] = {
    "usda_fooddata_central_survey": {"calories": 0.99, "vitamin_b6": 0.99},
    # The supplied Foundation release reports no supported energy value for 42 foods.
    "usda_fooddata_central_foundation": {"calories": 0.85, "vitamin_b6": 0.50},
    "usda_fooddata_central_sr_legacy": {"calories": 0.99, "vitamin_b6": 0.90},
}


@dataclass(frozen=True)
class OutputReport:
    output_path: Path | None
    manifest_path: Path | None
    rejects_path: Path | None
    scanned: int
    emitted: int
    rejected: int


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    paths = [path] if path.is_file() else sorted(candidate for candidate in path.rglob("*") if candidate.is_file())
    for candidate in paths:
        digest.update(str(candidate.relative_to(path) if path.is_dir() else candidate.name).encode())
        with candidate.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()


def _default_sidecar(output_path: Path, suffix: str) -> Path:
    stem = output_path.name.removesuffix(output_path.suffix)
    return output_path.with_name(f"{stem}.{suffix}")


def _write_json_line(handle, payload: Any, digest=None) -> None:
    encoded = json.dumps(payload, ensure_ascii=False, allow_nan=False) + "\n"
    handle.write(encoded)
    if digest is not None:
        digest.update(encoded.encode("utf-8"))


def _manifest_payload(
    *,
    status: str,
    source_name: str | None,
    started_at: datetime,
    output_path: Path | None,
    output_hash: str | None,
    input_paths: Iterable[Path],
    scanned: int,
    emitted: int,
    rejected: int,
    contract_errors: int,
    reasons: Counter[str],
    coverage: dict[str, Counter[str]],
    max_rejected_rows: int,
    max_rejected_fraction: float,
) -> dict[str, Any]:
    inputs = []
    for path in input_paths:
        size = (
            path.stat().st_size
            if path.is_file()
            else sum(candidate.stat().st_size for candidate in path.rglob("*") if candidate.is_file())
        )
        inputs.append({"path": str(path), "bytes": size, "sha256": _sha256(path)})
    return {
        "schema_version": SCHEMA_VERSION,
        "status": status,
        "source": source_name,
        "started_at": started_at.isoformat(),
        "completed_at": datetime.now(UTC).isoformat(),
        "nutrient_basis": {"amount": 100, "unit": "g"},
        "inputs": inputs,
        "output": {
            "path": str(output_path) if output_path is not None else "-",
            "sha256": output_hash,
            "rows": emitted,
        },
        "counts": {
            "scanned": scanned,
            "emitted": emitted,
            "rejected": rejected,
            "contract_errors": contract_errors,
            "reasons": dict(sorted(reasons.items())),
        },
        "quality_gate": {
            "max_rejected_rows": max_rejected_rows,
            "max_rejected_fraction": max_rejected_fraction,
        },
        "coverage": {
            source: {field: count for field, count in sorted(fields.items())}
            for source, fields in sorted(coverage.items())
        },
    }


def write_jsonl(
    rows: Iterable[dict[str, Any]],
    output_path: Path | None,
    *,
    source_name: str | None = None,
    input_paths: Iterable[Path] = (),
    rejects_path: Path | None = None,
    manifest_path: Path | None = None,
    max_rejected_rows: int = 100,
    max_rejected_fraction: float = 0.001,
    progress_every: int = 10000,
) -> OutputReport:
    """Write rows as JSONL. When output_path is None, write to stdout."""

    started_at = datetime.now(UTC)
    scanned = emitted = rejected = contract_errors = 0
    reasons: Counter[str] = Counter()
    coverage: dict[str, Counter[str]] = defaultdict(Counter)
    branded: bool | None = None
    digest = hashlib.sha256()
    input_paths = tuple(input_paths)

    if output_path is None:
        for row in rows:
            scanned += 1
            if branded is None:
                branded = "gtin" in row or "brand" in row
            issues = validate_normalized_row(row, branded=branded)
            if issues:
                rejected += 1
                contract_errors += sum(issue.kind == "contract" for issue in issues)
                reasons.update(issue.code for issue in issues)
                continue
            _write_json_line(sys.stdout, row, digest)
            emitted += 1
            _update_coverage(coverage, row)
        coverage_errors = _coverage_errors(coverage)
        contract_errors += len(coverage_errors)
        _enforce_quality(scanned, rejected, contract_errors, max_rejected_rows, max_rejected_fraction)
        return OutputReport(None, None, rejects_path, scanned, emitted, rejected)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    rejects_path = rejects_path or _default_sidecar(output_path, "rejected.jsonl")
    manifest_path = manifest_path or _default_sidecar(output_path, "manifest.json")

    with tempfile.TemporaryDirectory(prefix=".titan-run-", dir=output_path.parent) as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        candidate_output = temp_dir / output_path.name
        candidate_rejects = temp_dir / rejects_path.name
        candidate_manifest = temp_dir / manifest_path.name

        with candidate_output.open("w", encoding="utf-8", newline="\n") as output_handle, candidate_rejects.open("w", encoding="utf-8", newline="\n") as rejects_handle:
            for row in rows:
                scanned += 1
                if branded is None:
                    branded = "gtin" in row or "brand" in row
                issues = validate_normalized_row(row, branded=branded)
                if issues:
                    rejected += 1
                    contract_errors += sum(issue.kind == "contract" for issue in issues)
                    reasons.update(issue.code for issue in issues)
                    _write_json_line(rejects_handle, _rejection_record(row, issues))
                else:
                    _write_json_line(output_handle, row, digest)
                    emitted += 1
                    _update_coverage(coverage, row)
                if progress_every > 0 and scanned % progress_every == 0:
                    print(f"titan: scanned={scanned:,} emitted={emitted:,} rejected={rejected:,}", file=sys.stderr)

        coverage_errors = _coverage_errors(coverage)
        contract_errors += len(coverage_errors)
        reasons.update(coverage_errors)
        rejected_fraction = rejected / scanned if scanned else 0.0
        failed = contract_errors > 0 or rejected > max_rejected_rows or rejected_fraction > max_rejected_fraction
        status = "failed" if failed else "success"
        manifest = _manifest_payload(
            status=status,
            source_name=source_name,
            started_at=started_at,
            output_path=output_path,
            output_hash=digest.hexdigest(),
            input_paths=input_paths,
            scanned=scanned,
            emitted=emitted,
            rejected=rejected,
            contract_errors=contract_errors,
            reasons=reasons,
            coverage=coverage,
            max_rejected_rows=max_rejected_rows,
            max_rejected_fraction=max_rejected_fraction,
        )
        with candidate_manifest.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(manifest, handle, ensure_ascii=False, allow_nan=False, indent=2)
            handle.write("\n")

        if failed:
            timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
            failed_prefix = output_path.with_name(f"{output_path.stem}.failed-{timestamp}")
            os.replace(candidate_output, Path(f"{failed_prefix}.jsonl"))
            os.replace(candidate_rejects, Path(f"{failed_prefix}.rejected.jsonl"))
            os.replace(candidate_manifest, Path(f"{failed_prefix}.manifest.json"))
            _enforce_quality(scanned, rejected, contract_errors, max_rejected_rows, max_rejected_fraction)

        rejects_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        os.replace(candidate_output, output_path)
        os.replace(candidate_rejects, rejects_path)
        os.replace(candidate_manifest, manifest_path)

    return OutputReport(output_path, manifest_path, rejects_path, scanned, emitted, rejected)


def _update_coverage(coverage: dict[str, Counter[str]], row: dict[str, Any]) -> None:
    source = str(row.get("source") or "unknown")
    coverage[source]["__rows__"] += 1
    for field in CORE_FOOD_FIELDS:
        if row.get(field) is not None:
            coverage[source][field] += 1


def _coverage_errors(coverage: dict[str, Counter[str]]) -> list[str]:
    errors: list[str] = []
    for source, thresholds in MINIMUM_SOURCE_COVERAGE.items():
        fields = coverage.get(source)
        if not fields:
            continue
        rows = fields["__rows__"]
        if rows < 100:
            continue
        for field, minimum in thresholds.items():
            fraction = fields[field] / rows
            if fraction < minimum:
                errors.append(f"coverage_below_minimum:{source}:{field}")
    return errors


def _rejection_record(row: dict[str, Any], issues: list[ValidationIssue]) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "source": row.get("source"),
        "source_id": row.get("source_id"),
        "name": row.get("name"),
        "reason_codes": sorted({issue.code for issue in issues}),
        "errors": [issue.as_dict() for issue in issues],
        "row": safe_json_value(row),
    }


def _enforce_quality(scanned: int, rejected: int, contract_errors: int, max_rows: int, max_fraction: float) -> None:
    rejected_fraction = rejected / scanned if scanned else 0.0
    if contract_errors:
        raise RuntimeError(f"Output failed validation with {contract_errors} contract error(s)")
    if rejected > max_rows or rejected_fraction > max_fraction:
        raise RuntimeError(
            f"Output failed quality gate: rejected={rejected}/{scanned} ({rejected_fraction:.3%}), limits={max_rows} rows/{max_fraction:.3%}"
        )


def _write_jsonl_stream(rows: Iterable[dict[str, Any]], handle) -> None:
    try:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, allow_nan=False))
            handle.write("\n")
    except BrokenPipeError:
        # Prevent unraisable BrokenPipeError during interpreter shutdown when piping to `head`.
        if handle is sys.stdout:
            try:
                sys.stdout = open(os.devnull, "w", encoding="utf-8")
            except OSError:
                pass
        return
