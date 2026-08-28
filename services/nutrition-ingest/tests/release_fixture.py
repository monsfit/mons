import hashlib
import json
from pathlib import Path

from nutrition_ingest.common.schema import SCHEMA_VERSION
from nutrition_ingest.release import write_catalog_parquet


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_release(
    root: Path,
    raw_rows: list[dict],
    branded_rows: list[dict],
    *,
    release_id: str = "2026-08-27-a1b2c3d4",
) -> tuple[Path, Path]:
    catalog = root / "foods.parquet"
    rejects = root / "rejects.jsonl"
    reports, logical_hash = write_catalog_parquet(raw_rows, branded_rows, catalog, rejects)
    manifest = root / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "manifest_version": 1,
                "status": "success",
                "release_id": release_id,
                "schema_version": SCHEMA_VERSION,
                "built_at": "2026-08-27T12:00:00+00:00",
                "sources": [],
                "counts": {
                    "raw": reports["raw"].emitted,
                    "branded": reports["branded"].emitted,
                    "rejected": reports["raw"].rejected + reports["branded"].rejected,
                },
                "rejection_reasons": {"raw": {}, "branded": {}},
                "coverage": {"raw": {}, "branded": {}},
                "logical_sha256": logical_hash,
                "artifact": {
                    "filename": catalog.name,
                    "bytes": catalog.stat().st_size,
                    "sha256": _sha256(catalog),
                },
            }
        )
        + "\n"
    )
    return catalog, manifest
