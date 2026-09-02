from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
import pyarrow.parquet as pq

from nutrition_ingest.common.schema import (
    CORE_FOOD_FIELDS,
    FIELD_DEFINITIONS,
    NUTRIENT_FIELDS,
    SCHEMA_VERSION,
)
from nutrition_ingest.common.validation import validate_normalized_row

ADVISORY_LOCK_ID = 7_140_221
LOAD_PROGRESS_EVERY = 100_000
SCHEMA_NAME_PATTERN = re.compile(r"^[a-z_][a-z0-9_]*$")
RELEASE_ID_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validated_schema_name(value: str) -> str:
    if len(value) > 32 or SCHEMA_NAME_PATTERN.fullmatch(value) is None:
        raise RuntimeError(
            "Postgres schema names must be at most 32 lowercase letters, digits, or "
            "underscores and cannot start with a digit"
        )
    return value


def _first_value(row: tuple[Any, ...] | None, label: str) -> Any:
    if row is None:
        raise RuntimeError(f"PostgreSQL returned no row for {label}")
    return row[0]


def load_verified_manifest(
    catalog_path: Path,
    manifest_path: Path,
) -> dict[str, Any]:
    if not catalog_path.is_file():
        raise RuntimeError(f"Missing catalog Parquet input: {catalog_path}")
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing manifest: {manifest_path}")
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise RuntimeError(f"Manifest must be an object: {manifest_path}")
    if manifest.get("manifest_version") != 1 or manifest.get("status") != "success":
        raise RuntimeError(f"Manifest is not successful: {manifest_path}")
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise RuntimeError(
            f"Manifest schema {manifest.get('schema_version')!r} is not supported; expected {SCHEMA_VERSION}"
        )
    release_id = manifest.get("release_id")
    if not isinstance(release_id, str) or RELEASE_ID_PATTERN.fullmatch(release_id) is None:
        raise RuntimeError(f"Manifest has an invalid release ID: {manifest_path}")
    artifact = manifest.get("artifact")
    if not isinstance(artifact, dict) or artifact.get("filename") != "foods.parquet":
        raise RuntimeError(f"Manifest has no catalog Parquet artifact: {manifest_path}")
    actual_hash = _sha256(catalog_path)
    if artifact.get("sha256") != actual_hash:
        raise RuntimeError(
            f"Catalog Parquet hash does not match manifest for {catalog_path}: "
            f"expected={artifact.get('sha256')}, actual={actual_hash}"
        )
    counts = manifest.get("counts")
    if not isinstance(counts, dict):
        raise RuntimeError(f"Manifest has no catalog counts: {manifest_path}")
    for kind in ("raw", "branded"):
        if not isinstance(counts.get(kind), int) or counts[kind] < 0:
            raise RuntimeError(f"Manifest has an invalid {kind} row count: {manifest_path}")
    return manifest


def _schema_ddl(schema: str) -> str:
    nutrient_columns = ",\n".join(
        f'    "{field}" double precision CHECK ("{field}" IS NULL OR "{field}" >= 0)'
        for field in NUTRIENT_FIELDS
    )
    return f"""
CREATE SCHEMA "{schema}";
CREATE TABLE "{schema}".catalog_metadata (
    release_id text PRIMARY KEY,
    schema_version text NOT NULL,
    built_at timestamptz NOT NULL,
    loaded_at timestamptz NOT NULL,
    raw_rows bigint NOT NULL DEFAULT 0,
    branded_rows bigint NOT NULL DEFAULT 0
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
    searchable = """
            char_length(name) <= 160
            AND calories IS NOT NULL AND calories BETWEEN 0 AND 1000
            AND protein IS NOT NULL AND protein BETWEEN 0 AND 100
            AND total_fat IS NOT NULL AND total_fat BETWEEN 0 AND 100
            AND coalesce(carbohydrates_total, carbohydrates_available) IS NOT NULL
            AND coalesce(carbohydrates_total, carbohydrates_available) BETWEEN 0 AND 100
            AND protein + total_fat + coalesce(carbohydrates_total, carbohydrates_available) <= 120
            AND (
                calories > 0
                OR protein + total_fat + coalesce(carbohydrates_total, carbohydrates_available) = 0
            )
            AND (dataset_kind = 'raw' OR gtin IS NOT NULL)
    """.strip()
    return (
        f'CREATE INDEX raw_foods_search_document_idx ON "{schema}".raw_foods USING gin (search_document)',
        f'CREATE INDEX branded_foods_search_document_idx ON "{schema}".branded_foods USING gin (search_document)',
        f'''CREATE INDEX raw_foods_name_prefix_idx ON "{schema}".raw_foods (
            (lower(name) COLLATE "C"),
            (CASE source WHEN 'usda_fooddata_central_branded' THEN 0 WHEN 'open_food_facts' THEN 1 ELSE 2 END),
            food_id
        ) WHERE {searchable}''',
        f'''CREATE INDEX branded_foods_name_prefix_idx ON "{schema}".branded_foods (
            (lower(name) COLLATE "C"),
            (CASE source WHEN 'usda_fooddata_central_branded' THEN 0 WHEN 'open_food_facts' THEN 1 ELSE 2 END),
            food_id
        ) WHERE {searchable}''',
        f'''CREATE INDEX branded_foods_brand_prefix_idx ON "{schema}".branded_foods (
            (lower(brand) COLLATE "C"),
            (CASE source WHEN 'usda_fooddata_central_branded' THEN 0 WHEN 'open_food_facts' THEN 1 ELSE 2 END),
            food_id
        ) WHERE brand IS NOT NULL AND {searchable}''',
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
    ]


def _copy_statement(schema: str, table: str, columns: list[str]) -> str:
    quoted = ", ".join(f'"{column}"' for column in columns)
    return f'COPY "{schema}"."{table}" ({quoted}) FROM STDIN'


def _row_values(row: dict[str, Any], dataset_kind: str, food_id: int) -> tuple[Any, ...]:
    values: list[Any] = [dataset_kind, food_id]
    for field in CORE_FOOD_FIELDS:
        if field == "portions":
            continue
        values.append(row.get(field))
    values.extend([row.get("brand"), row.get("gtin")])
    return tuple(values)


def _load_catalog(
    food_copy,
    portion_copy,
    catalog_path: Path,
) -> dict[str, int]:
    counts = {"raw": 0, "branded": 0}
    total = 0
    parquet = pq.ParquetFile(catalog_path)
    for batch in parquet.iter_batches(batch_size=10_000):
        for catalog_row in batch.to_pylist():
            dataset_kind = catalog_row.get("dataset_kind")
            if dataset_kind not in counts:
                raise RuntimeError(f"Invalid dataset kind in {catalog_path}: {dataset_kind!r}")
            row = {field: catalog_row.get(field) for field in CORE_FOOD_FIELDS}
            if dataset_kind == "branded":
                row.update({"brand": catalog_row.get("brand"), "gtin": catalog_row.get("gtin")})
            issues = validate_normalized_row(row, branded=dataset_kind == "branded")
            if issues:
                codes = ", ".join(sorted({issue.code for issue in issues}))
                raise RuntimeError(
                    f"Row no longer satisfies schema {SCHEMA_VERSION} at "
                    f"{catalog_path}:{total + 1}: {codes}"
                )
            food_id = total + 1
            food_copy.write_row(_row_values(row, dataset_kind, food_id))
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
            counts[dataset_kind] += 1
            total += 1
            if total % LOAD_PROGRESS_EVERY == 0:
                print(f"Mons nutrition: loaded rows={total:,}", file=sys.stderr)
    return counts


def ingest(
    *,
    catalog_path: Path,
    manifest_path: Path,
    database_url: str | None = None,
    runtime_role: str,
    active_schema: str = "mons_catalog",
) -> dict[str, Any]:
    database_url = _database_url(database_url)
    active_schema = _validated_schema_name(active_schema)
    runtime_role = _validated_schema_name(runtime_role)
    manifest = load_verified_manifest(catalog_path, manifest_path)
    release_id = manifest["release_id"]

    suffix = uuid.uuid4().hex[:12]
    staging_schema = f"{active_schema}_stage_{suffix}"
    previous_schema = f"{active_schema}_previous_{suffix}"

    with psycopg.connect(database_url) as connection:
        acquired = _first_value(
            connection.execute("SELECT pg_try_advisory_lock(%s)", (ADVISORY_LOCK_ID,)).fetchone(),
            "catalog ingestion lock",
        )
        if not acquired:
            raise RuntimeError("Another Mons Postgres ingestion is already running")
        try:
            metadata_exists = _first_value(
                connection.execute(
                    "SELECT to_regclass(%s) IS NOT NULL",
                    (f"{active_schema}.catalog_metadata",),
                ).fetchone(),
                "catalog metadata lookup",
            )
            if metadata_exists:
                current_release = connection.execute(
                    f'SELECT release_id FROM "{active_schema}".catalog_metadata LIMIT 1'
                ).fetchone()
                if current_release and current_release[0] == release_id:
                    return {
                        "release_id": release_id,
                        "raw_rows": manifest["counts"]["raw"],
                        "branded_rows": manifest["counts"]["branded"],
                        "loaded": False,
                    }

            connection.execute(_schema_ddl(staging_schema))
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
                        counts = _load_catalog(food_copy, portion_copy, catalog_path)
                food_connection.commit()
                portion_connection.commit()

            raw_count = counts["raw"]
            branded_count = counts["branded"]
            if raw_count != manifest["counts"]["raw"]:
                raise RuntimeError("Raw database row count does not match the manifest")
            if branded_count != manifest["counts"]["branded"]:
                raise RuntimeError("Branded database row count does not match the manifest")

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
            for statement in _index_ddl(staging_schema):
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
                f'INSERT INTO "{staging_schema}".catalog_metadata '
                "(release_id, schema_version, built_at, loaded_at, raw_rows, branded_rows) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (
                    release_id,
                    SCHEMA_VERSION,
                    manifest["built_at"],
                    datetime.now(UTC),
                    raw_count,
                    branded_count,
                ),
            )
            connection.execute(f'GRANT USAGE ON SCHEMA "{staging_schema}" TO "{runtime_role}"')
            connection.execute(
                f'GRANT SELECT ON ALL TABLES IN SCHEMA "{staging_schema}" TO "{runtime_role}"'
            )
            connection.commit()

            active_exists = _first_value(
                connection.execute(
                    "SELECT to_regnamespace(%s) IS NOT NULL", (active_schema,)
                ).fetchone(),
                "active catalog lookup",
            )
            if active_exists:
                connection.execute(f'ALTER SCHEMA "{active_schema}" RENAME TO "{previous_schema}"')
            connection.execute(f'ALTER SCHEMA "{staging_schema}" RENAME TO "{active_schema}"')
            if active_exists:
                connection.execute(f'DROP SCHEMA "{previous_schema}" CASCADE')
            connection.commit()
        except Exception:
            connection.rollback()
            if _first_value(
                connection.execute(
                    "SELECT to_regnamespace(%s) IS NOT NULL", (staging_schema,)
                ).fetchone(),
                "staging catalog lookup",
            ):
                connection.execute(f'DROP SCHEMA "{staging_schema}" CASCADE')
                connection.commit()
            raise
        finally:
            connection.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))

    return {
        "release_id": release_id,
        "raw_rows": raw_count,
        "branded_rows": branded_count,
        "loaded": True,
    }


def _database_url(value: str | None) -> str:
    database_url = value or os.environ.get("MIGRATION_DATABASE_URL")
    if not database_url:
        raise RuntimeError("MIGRATION_DATABASE_URL or --database-url is required")
    parsed = urlsplit(database_url)
    query = [
        (key, item)
        for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if key.casefold() != "uselibpqcompat"
    ]
    return urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)
    )


def status(
    database_url: str | None = None, *, active_schema: str = "mons_catalog"
) -> dict[str, Any]:
    database_url = _database_url(database_url)
    active_schema = _validated_schema_name(active_schema)
    with psycopg.connect(database_url) as connection:
        server_version = _first_value(
            connection.execute("SHOW server_version").fetchone(), "server version"
        )
        active = _first_value(
            connection.execute(
                "SELECT to_regnamespace(%s) IS NOT NULL", (active_schema,)
            ).fetchone(),
            "active catalog lookup",
        )
        result: dict[str, Any] = {
            "connected": True,
            "server_version": server_version,
            "active": active,
        }
        if active:
            row = connection.execute(
                f"SELECT release_id, schema_version, built_at, loaded_at, raw_rows, branded_rows "
                f'FROM "{active_schema}".catalog_metadata LIMIT 1'
            ).fetchone()
            if row:
                result["counts"] = {"raw": row[4], "branded": row[5]}
                result["release"] = {
                    "release_id": row[0],
                    "schema_version": row[1],
                    "built_at": row[2].isoformat(),
                    "loaded_at": row[3].isoformat(),
                }
        return result
