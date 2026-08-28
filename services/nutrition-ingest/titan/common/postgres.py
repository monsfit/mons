from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from titan.common.schema import CORE_FOOD_FIELDS, FIELD_DEFINITIONS, NUTRIENT_FIELDS, SCHEMA_VERSION
from titan.common.validation import validate_normalized_row

DEFAULT_DATABASE_URL = "postgresql://mons:mons_local@localhost:5432/mons"
ADVISORY_LOCK_ID = 7_140_221
LOAD_PROGRESS_EVERY = 100_000
SCHEMA_NAME_PATTERN = re.compile(r"^[a-z_][a-z0-9_]*$")


def _psycopg():
    try:
        import psycopg
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Postgres support requires the `postgres` extra: uv sync --extra postgres"
        ) from exc
    return psycopg


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def default_manifest_path(jsonl_path: Path) -> Path:
    return jsonl_path.with_name(f"{jsonl_path.stem}.manifest.json")


def _validated_schema_name(value: str) -> str:
    if len(value) > 32 or SCHEMA_NAME_PATTERN.fullmatch(value) is None:
        raise RuntimeError(
            "Postgres schema names must be at most 32 lowercase letters, digits, or "
            "underscores and cannot start with a digit"
        )
    return value


def load_verified_manifest(jsonl_path: Path, manifest_path: Path) -> dict[str, Any]:
    if not jsonl_path.is_file():
        raise RuntimeError(f"Missing JSONL input: {jsonl_path}")
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing manifest: {manifest_path}")
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise RuntimeError(f"Manifest must be an object: {manifest_path}")
    if manifest.get("status") != "success":
        raise RuntimeError(f"Manifest is not successful: {manifest_path}")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise RuntimeError(
            f"Manifest schema {manifest.get('schema_version')!r} is not supported; expected {SCHEMA_VERSION}"
        )
    output = manifest.get("output")
    if not isinstance(output, dict):
        raise RuntimeError(f"Manifest has no output metadata: {manifest_path}")
    expected_hash = output.get("sha256")
    actual_hash = _sha256(jsonl_path)
    if expected_hash != actual_hash:
        raise RuntimeError(
            f"JSONL hash does not match manifest for {jsonl_path}: expected={expected_hash}, actual={actual_hash}"
        )
    if not isinstance(output.get("rows"), int) or output["rows"] < 0:
        raise RuntimeError(f"Manifest has an invalid output row count: {manifest_path}")
    return manifest


def _schema_ddl(schema: str) -> str:
    nutrient_columns = ",\n".join(
        f'    "{field}" double precision CHECK ("{field}" IS NULL OR "{field}" >= 0)'
        for field in NUTRIENT_FIELDS
    )
    return f"""
CREATE SCHEMA "{schema}";
CREATE TABLE "{schema}".ingestion_runs (
    run_id uuid PRIMARY KEY,
    schema_version text NOT NULL,
    package_version text NOT NULL,
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    raw_manifest jsonb NOT NULL,
    branded_manifest jsonb NOT NULL,
    raw_rows bigint NOT NULL DEFAULT 0,
    branded_rows bigint NOT NULL DEFAULT 0,
    status text NOT NULL CHECK (status IN ('loading', 'success'))
);
CREATE TABLE "{schema}".foods (
    dataset_kind text NOT NULL CHECK (dataset_kind IN ('raw', 'branded')),
    food_id bigint NOT NULL,
    source_id text NOT NULL CHECK (btrim(source_id) <> ''),
    source text NOT NULL CHECK (btrim(source) <> ''),
    name text NOT NULL CHECK (btrim(name) <> ''),
{nutrient_columns},
    brand text,
    search_document tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
    ) STORED,
    gtin char(14),
    ingestion_run_id uuid NOT NULL REFERENCES "{schema}".ingestion_runs(run_id),
    PRIMARY KEY (dataset_kind, food_id),
    CHECK (gtin IS NULL OR gtin ~ '^[0-9]{{14}}$'),
    CHECK (
        carbohydrates_net_calculated IS NULL
        OR carbohydrates_total IS NULL
        OR carbohydrates_net_calculated <= carbohydrates_total
    )
) PARTITION BY LIST (dataset_kind);
CREATE TABLE "{schema}".raw_foods PARTITION OF "{schema}".foods
    FOR VALUES IN ('raw');
ALTER TABLE "{schema}".raw_foods
    ADD CHECK (brand IS NULL AND gtin IS NULL);
CREATE TABLE "{schema}".branded_foods PARTITION OF "{schema}".foods
    FOR VALUES IN ('branded');

CREATE TABLE "{schema}".portions (
    dataset_kind text NOT NULL CHECK (dataset_kind IN ('raw', 'branded')),
    food_id bigint NOT NULL,
    ordinal integer NOT NULL CHECK (ordinal >= 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    amount double precision NOT NULL CHECK (amount > 0),
    unit text NOT NULL CHECK (unit IN ('g', 'ml')),
    PRIMARY KEY (dataset_kind, food_id, ordinal)
) PARTITION BY LIST (dataset_kind);
CREATE TABLE "{schema}".raw_portions PARTITION OF "{schema}".portions
    FOR VALUES IN ('raw');
CREATE TABLE "{schema}".branded_portions PARTITION OF "{schema}".portions
    FOR VALUES IN ('branded');

CREATE TABLE "{schema}".nutrient_definitions (
    field_name text PRIMARY KEY,
    unit text NOT NULL,
    description text NOT NULL,
    value_kind text NOT NULL CHECK (value_kind IN ('direct', 'derived'))
);
"""


def _index_ddl(schema: str) -> tuple[str, ...]:
    return (
        'CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public',
        f'CREATE INDEX raw_foods_name_trgm_idx ON "{schema}".raw_foods USING gin (name gin_trgm_ops)',
        f'CREATE INDEX branded_foods_name_trgm_idx ON "{schema}".branded_foods USING gin (name gin_trgm_ops)',
        f'CREATE INDEX branded_foods_brand_trgm_idx ON "{schema}".branded_foods USING gin (brand gin_trgm_ops)',
        f'CREATE INDEX raw_foods_search_document_idx ON "{schema}".raw_foods USING gin (search_document)',
        f'CREATE INDEX branded_foods_search_document_idx ON "{schema}".branded_foods USING gin (search_document)',
        f'CREATE UNIQUE INDEX branded_foods_gtin_idx ON "{schema}".branded_foods (gtin) WHERE gtin IS NOT NULL',
        f'CREATE INDEX raw_foods_source_idx ON "{schema}".raw_foods (source, source_id)',
        f'CREATE INDEX branded_foods_source_idx ON "{schema}".branded_foods (source, source_id)',
    )


def _food_columns() -> list[str]:
    return [
        "dataset_kind",
        "food_id",
        *[field for field in CORE_FOOD_FIELDS if field != "portions"],
        "brand",
        "gtin",
        "ingestion_run_id",
    ]


def _copy_statement(schema: str, table: str, columns: list[str]) -> str:
    quoted = ", ".join(f'"{column}"' for column in columns)
    return f'COPY "{schema}"."{table}" ({quoted}) FROM STDIN'


def _row_values(row: dict[str, Any], dataset_kind: str, food_id: int, run_id: uuid.UUID) -> tuple[Any, ...]:
    values: list[Any] = [dataset_kind, food_id]
    for field in CORE_FOOD_FIELDS:
        if field == "portions":
            continue
        values.append(row.get(field))
    values.extend([row.get("brand"), row.get("gtin"), run_id])
    return tuple(values)


def _load_dataset(
    food_copy,
    portion_copy,
    jsonl_path: Path,
    dataset_kind: str,
    run_id: uuid.UUID,
    first_food_id: int,
) -> tuple[int, dict[str, Counter[str]]]:
    count = 0
    coverage: dict[str, Counter[str]] = defaultdict(Counter)
    with jsonl_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid JSON at {jsonl_path}:{line_number}: {exc}") from exc
            if not isinstance(row, dict):
                raise RuntimeError(f"Expected object at {jsonl_path}:{line_number}")
            issues = validate_normalized_row(row, branded=dataset_kind == "branded")
            if issues:
                codes = ", ".join(sorted({issue.code for issue in issues}))
                raise RuntimeError(
                    f"Row no longer satisfies schema {SCHEMA_VERSION} at "
                    f"{jsonl_path}:{line_number}: {codes}"
                )
            food_id = first_food_id + count
            food_copy.write_row(_row_values(row, dataset_kind, food_id, run_id))
            portions = row.get("portions") or []
            for ordinal, portion in enumerate(portions):
                portion_copy.write_row(
                    (
                        dataset_kind,
                        food_id,
                        ordinal,
                        portion["name"],
                        portion["amount"],
                        portion["unit"],
                    )
                )
            source = str(row.get("source"))
            coverage[source]["__rows__"] += 1
            for field in CORE_FOOD_FIELDS:
                if row.get(field) is not None:
                    coverage[source][field] += 1
            count += 1
            if count % LOAD_PROGRESS_EVERY == 0:
                print(f"titan postgres: loaded {dataset_kind} rows={count:,}", file=sys.stderr)
    return count, coverage


def _compare_coverage(actual: dict[str, Counter[str]], manifest: dict[str, Any], label: str) -> None:
    expected = manifest.get("coverage")
    normalized_actual = {
        source: {field: count for field, count in fields.items()}
        for source, fields in actual.items()
    }
    if expected != normalized_actual:
        raise RuntimeError(f"{label} field coverage does not match its manifest")


def ingest(
    *,
    raw_path: Path,
    branded_path: Path,
    raw_manifest_path: Path | None = None,
    branded_manifest_path: Path | None = None,
    database_url: str | None = None,
    active_schema: str = "mons_catalog",
) -> dict[str, Any]:
    psycopg = _psycopg()
    database_url = database_url or os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    active_schema = _validated_schema_name(active_schema)
    raw_manifest_path = raw_manifest_path or default_manifest_path(raw_path)
    branded_manifest_path = branded_manifest_path or default_manifest_path(branded_path)
    raw_manifest = load_verified_manifest(raw_path, raw_manifest_path)
    branded_manifest = load_verified_manifest(branded_path, branded_manifest_path)

    required_bytes = raw_path.stat().st_size + branded_path.stat().st_size
    free_bytes = shutil.disk_usage(Path.cwd()).free
    if free_bytes < required_bytes * 2:
        raise RuntimeError(
            f"Insufficient host free space for an atomic database load: free={free_bytes:,}, required~={required_bytes * 2:,}"
        )

    run_id = uuid.uuid4()
    suffix = run_id.hex[:12]
    staging_schema = f"{active_schema}_stage_{suffix}"
    previous_schema = f"{active_schema}_previous_{suffix}"
    started_at = datetime.now(UTC)

    with psycopg.connect(database_url) as connection:
        acquired = connection.execute(
            "SELECT pg_try_advisory_lock(%s)", (ADVISORY_LOCK_ID,)
        ).fetchone()[0]
        if not acquired:
            raise RuntimeError("Another Mons Postgres ingestion is already running")
        try:
            connection.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public")
            connection.execute(_schema_ddl(staging_schema))
            connection.execute(
                f'INSERT INTO "{staging_schema}".ingestion_runs '
                "(run_id, schema_version, package_version, started_at, raw_manifest, branded_manifest, status) "
                "VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, 'loading')",
                (
                    run_id,
                    SCHEMA_VERSION,
                    "0.2.0",
                    started_at,
                    json.dumps(raw_manifest),
                    json.dumps(branded_manifest),
                ),
            )
            connection.commit()

            food_columns = _food_columns()
            portion_columns = ["dataset_kind", "food_id", "ordinal", "name", "amount", "unit"]
            with (
                psycopg.connect(database_url) as food_connection,
                psycopg.connect(database_url) as portion_connection,
            ):
                with (
                    food_connection.cursor() as food_cursor,
                    portion_connection.cursor() as portion_cursor,
                ):
                    with (
                        food_cursor.copy(
                            _copy_statement(staging_schema, "foods", food_columns)
                        ) as food_copy,
                        portion_cursor.copy(
                            _copy_statement(staging_schema, "portions", portion_columns)
                        ) as portion_copy,
                    ):
                        raw_count, raw_coverage = _load_dataset(
                            food_copy, portion_copy, raw_path, "raw", run_id, 1
                        )
                        branded_count, branded_coverage = _load_dataset(
                            food_copy,
                            portion_copy,
                            branded_path,
                            "branded",
                            run_id,
                            raw_count + 1,
                        )
                food_connection.commit()
                portion_connection.commit()

            if raw_count != raw_manifest["output"]["rows"]:
                raise RuntimeError("Raw database row count does not match the manifest")
            if branded_count != branded_manifest["output"]["rows"]:
                raise RuntimeError("Branded database row count does not match the manifest")
            _compare_coverage(raw_coverage, raw_manifest, "Raw")
            _compare_coverage(branded_coverage, branded_manifest, "Branded")

            definitions = [
                (definition.name, definition.unit, definition.description, definition.value_kind)
                for definition in FIELD_DEFINITIONS
                if definition.unit is not None
            ]
            with connection.cursor() as cursor:
                cursor.executemany(
                    f'INSERT INTO "{staging_schema}".nutrient_definitions VALUES (%s, %s, %s, %s)',
                    definitions,
                )
            connection.execute(
                f'ALTER TABLE "{staging_schema}".portions ADD CONSTRAINT portions_food_fk '
                f'FOREIGN KEY (dataset_kind, food_id) REFERENCES "{staging_schema}".foods(dataset_kind, food_id) ON DELETE CASCADE'
            )
            for statement in _index_ddl(staging_schema)[1:]:
                connection.execute(statement)
            connection.execute(f'ANALYZE "{staging_schema}".foods')
            connection.execute(f'ANALYZE "{staging_schema}".portions')
            database_counts = connection.execute(
                f'SELECT dataset_kind, count(*) FROM "{staging_schema}".foods GROUP BY dataset_kind'
            ).fetchall()
            counts = {kind: count for kind, count in database_counts}
            if counts != {"raw": raw_count, "branded": branded_count}:
                raise RuntimeError(f"Postgres verification count mismatch: {counts}")
            connection.execute(
                f'UPDATE "{staging_schema}".ingestion_runs SET completed_at = %s, raw_rows = %s, branded_rows = %s, status = \'success\' WHERE run_id = %s',
                (datetime.now(UTC), raw_count, branded_count, run_id),
            )
            connection.commit()

            active_exists = connection.execute(
                "SELECT to_regnamespace(%s) IS NOT NULL", (active_schema,)
            ).fetchone()[0]
            if active_exists:
                connection.execute(
                    f'ALTER SCHEMA "{active_schema}" RENAME TO "{previous_schema}"'
                )
            connection.execute(
                f'ALTER SCHEMA "{staging_schema}" RENAME TO "{active_schema}"'
            )
            connection.commit()
            if active_exists:
                connection.execute(f'DROP SCHEMA "{previous_schema}" CASCADE')
                connection.commit()
        except Exception:
            connection.rollback()
            if connection.execute(
                "SELECT to_regnamespace(%s) IS NOT NULL", (staging_schema,)
            ).fetchone()[0]:
                connection.execute(f'DROP SCHEMA "{staging_schema}" CASCADE')
                connection.commit()
            raise
        finally:
            connection.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))

    return {"run_id": str(run_id), "raw_rows": raw_count, "branded_rows": branded_count}


def status(database_url: str | None = None, *, active_schema: str = "mons_catalog") -> dict[str, Any]:
    psycopg = _psycopg()
    database_url = database_url or os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    active_schema = _validated_schema_name(active_schema)
    with psycopg.connect(database_url) as connection:
        server_version = connection.execute("SHOW server_version").fetchone()[0]
        active = connection.execute(
            "SELECT to_regnamespace(%s) IS NOT NULL", (active_schema,)
        ).fetchone()[0]
        result: dict[str, Any] = {"connected": True, "server_version": server_version, "active": active}
        if active:
            result["counts"] = dict(
                connection.execute(
                    f'SELECT dataset_kind, count(*) FROM "{active_schema}".foods GROUP BY dataset_kind'
                ).fetchall()
            )
            row = connection.execute(
                f'SELECT run_id, schema_version, package_version, started_at, completed_at, status FROM "{active_schema}".ingestion_runs ORDER BY started_at DESC LIMIT 1'
            ).fetchone()
            if row:
                result["run"] = {
                    "run_id": str(row[0]),
                    "schema_version": row[1],
                    "package_version": row[2],
                    "started_at": row[3].isoformat(),
                    "completed_at": row[4].isoformat() if row[4] else None,
                    "status": row[5],
                }
        return result
