from __future__ import annotations

import argparse
import json
import math
import sqlite3
import tempfile
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any

from titan.common.cli import add_quality_output_arguments, output_options, resolve_output_path
from titan.common.output import write_jsonl
from titan.common.paths import RAW_FOODS_OUTPUT
from titan.common.schema import NUTRIENT_FIELDS
from titan.nutrient_mapping import CORE_FIELD_UNITS, CORE_FOOD_FIELDS, USDA_FIELD_SPECS

from . import australia as australia_parser
from . import canada as canada_parser
from . import cofid as cofid_parser
from . import nevo as nevo_parser
from . import new_zealand as new_zealand_parser
from . import usda as usda_parser

SOURCE_NAME = "raw-foods"
BRANDED_OUTPUT_PREFIX = "branded-foods"


def _existing_path(path: Path, label: str) -> Path:
    if not path.exists():
        raise RuntimeError(f"Missing required input for {label}: {path}")
    return path


def build_default_paths(inputs_dir: Path) -> dict[str, Path]:
    return {
        "australia_workbook": inputs_dir / "australian-food-composition-database.xlsx",
        "canada_directory": inputs_dir / "canadian-nutrient-files",
        "cofid_workbook": inputs_dir / "CoFID.xlsx",
        "nevo_workbook": inputs_dir / "dutch-nutrient-database" / "NEVO2025_v9.0.xlsx",
        "new_zealand_workbook": inputs_dir / "new-zealand-food-concise.xlsx",
        "survey_json": inputs_dir / "FoodData_Central_survey_food_json.json",
        "foundation_json": inputs_dir
        / "FoodData_Central_foundation_food_json_2025-12-18.json",
        "sr_legacy_json": inputs_dir
        / "FoodData_Central_sr_legacy_food_json_2018-04.json",
        "nutrient_csv": inputs_dir / "FoodData_Central_csv_2025-04-24" / "nutrient.csv",
    }


def resolve_paths(args: Any) -> dict[str, Path]:
    inputs_dir = Path(args.inputs_dir)
    defaults = build_default_paths(inputs_dir)

    resolved = {
        "australia_workbook": Path(args.australia_workbook)
        if args.australia_workbook
        else defaults["australia_workbook"],
        "canada_directory": Path(args.canada_directory)
        if args.canada_directory
        else defaults["canada_directory"],
        "cofid_workbook": Path(args.cofid_workbook)
        if args.cofid_workbook
        else defaults["cofid_workbook"],
        "nevo_workbook": Path(args.nevo_workbook)
        if args.nevo_workbook
        else defaults["nevo_workbook"],
        "new_zealand_workbook": Path(args.new_zealand_workbook)
        if args.new_zealand_workbook
        else defaults["new_zealand_workbook"],
        "survey_json": Path(args.survey_json)
        if args.survey_json
        else defaults["survey_json"],
        "foundation_json": Path(args.foundation_json)
        if args.foundation_json
        else defaults["foundation_json"],
        "sr_legacy_json": Path(args.sr_legacy_json)
        if args.sr_legacy_json
        else defaults["sr_legacy_json"],
        "nutrient_csv": Path(args.nutrient_csv)
        if args.nutrient_csv
        else defaults["nutrient_csv"],
    }

    return {
        key: _existing_path(path, key.replace("_", " "))
        for key, path in resolved.items()
    }


def iter_rows(paths: dict[str, Path]):
    yield from enforce_defined_names(
        australia_parser.iter_rows(paths["australia_workbook"])
    )
    yield from enforce_defined_names(
        canada_parser.iter_rows(
            paths["canada_directory"] / "FOOD NAME.csv",
            paths["canada_directory"] / "NUTRIENT NAME.csv",
            paths["canada_directory"] / "NUTRIENT AMOUNT.csv",
        )
    )
    yield from enforce_defined_names(cofid_parser.iter_rows(paths["cofid_workbook"]))
    yield from enforce_defined_names(nevo_parser.iter_rows(paths["nevo_workbook"]))
    yield from enforce_defined_names(
        new_zealand_parser.iter_rows(paths["new_zealand_workbook"])
    )

    runtime_map = usda_parser.build_usda_runtime_map(USDA_FIELD_SPECS)
    nutrient_rows = usda_parser.load_nutrient_rows(paths["nutrient_csv"])
    usda_parser.validate_mapping_fields(runtime_map, CORE_FOOD_FIELDS)
    usda_parser.validate_mapping_nutrients(runtime_map, CORE_FOOD_FIELDS, nutrient_rows)
    usda_parser.validate_core_field_units_against_usda(
        runtime_map, nutrient_rows, CORE_FIELD_UNITS
    )

    yield from enforce_defined_names(
        usda_parser.iter_all_usda_rows(
            paths["survey_json"],
            paths["foundation_json"],
            paths["sr_legacy_json"],
            runtime_map,
            CORE_FOOD_FIELDS,
        )
    )


def normalize_name_key(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    key = " ".join(value.casefold().split())
    return key or None


def has_defined_name(value: Any) -> bool:
    return normalize_name_key(value) is not None


def enforce_defined_names(rows: Iterable[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    for row in rows:
        if has_defined_name(row.get("name")):
            yield row


def _is_valid_nutrient_value(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return not math.isnan(value)
    return False


def nutrient_completeness_score(row: dict[str, Any]) -> int:
    return sum(
        1 for field in NUTRIENT_FIELDS if _is_valid_nutrient_value(row.get(field))
    )


def source_priority(row: dict[str, Any]) -> int:
    source = row.get("source")
    if isinstance(source, str) and source.startswith("usda_fooddata_central_"):
        return 1
    return 0


def dedupe_rank(row: dict[str, Any]) -> tuple[int, int]:
    return (source_priority(row), nutrient_completeness_score(row))


def enforce_unique_names(rows: Iterable[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    with tempfile.TemporaryDirectory(prefix="mons-name-dedupe-") as temp_dir:
        database_path = Path(temp_dir) / "names.sqlite"
        with sqlite3.connect(database_path) as connection:
            connection.execute(
                """
                CREATE TABLE selected_rows (
                    name_key TEXT PRIMARY KEY,
                    ordinal INTEGER NOT NULL,
                    source_rank INTEGER NOT NULL,
                    completeness_rank INTEGER NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            ordinal = 0
            for row in rows:
                name_key = normalize_name_key(row.get("name"))
                if name_key is None:
                    name_key = f"__missing__:{ordinal}"
                source_rank, completeness_rank = dedupe_rank(row)
                payload = json.dumps(row, ensure_ascii=False)
                existing = connection.execute(
                    "SELECT ordinal, source_rank, completeness_rank FROM selected_rows WHERE name_key = ?",
                    (name_key,),
                ).fetchone()
                if existing is None:
                    connection.execute(
                        "INSERT INTO selected_rows VALUES (?, ?, ?, ?, ?)",
                        (name_key, ordinal, source_rank, completeness_rank, payload),
                    )
                    ordinal += 1
                elif (source_rank, completeness_rank) > (existing[1], existing[2]):
                    connection.execute(
                        "UPDATE selected_rows SET source_rank = ?, completeness_rank = ?, payload = ? WHERE name_key = ?",
                        (source_rank, completeness_rank, payload, name_key),
                    )
            connection.commit()
            cursor = connection.execute("SELECT payload FROM selected_rows ORDER BY ordinal")
            for (payload,) in cursor:
                row = json.loads(payload)
                if isinstance(row, dict):
                    yield row


def validate_raw_output_path(output_path: Path | None) -> None:
    if output_path is None:
        return

    output_name = output_path.name.casefold()
    if output_name.startswith(BRANDED_OUTPUT_PREFIX):
        raise RuntimeError(
            "Refusing to write raw rows to a branded-foods output path. "
            f"Use {RAW_FOODS_OUTPUT} or another raw-specific filename."
        )


def register_subparser(subparsers):
    parser = subparsers.add_parser(
        "normalize-raw",
        help="Merge non-branded source parsers into one normalized raw-foods JSONL",
    )
    parser.add_argument(
        "--inputs-dir",
        default="data/inputs",
        help="Base directory containing default source inputs (default: data/inputs)",
    )
    parser.add_argument("--australia-workbook", help="Path to Australian workbook")
    parser.add_argument("--canada-directory", help="Path to CNF directory")
    parser.add_argument("--cofid-workbook", help="Path to CoFID workbook")
    parser.add_argument("--nevo-workbook", help="Path to NEVO workbook")
    parser.add_argument("--new-zealand-workbook", help="Path to New Zealand workbook")
    parser.add_argument("--survey-json", help="Path to USDA survey JSON")
    parser.add_argument("--foundation-json", help="Path to USDA foundation JSON")
    parser.add_argument("--sr-legacy-json", help="Path to USDA SR legacy JSON")
    parser.add_argument("--nutrient-csv", help="Path to USDA nutrient.csv")
    parser.add_argument(
        "--allow-duplicate-names",
        action="store_true",
        help="Disable default raw name dedupe (by normalized name)",
    )
    add_quality_output_arguments(parser, source_name=SOURCE_NAME)
    parser.set_defaults(handler=run_from_args)


def run_from_args(args) -> None:
    output_path = resolve_output_path(args.output, SOURCE_NAME)
    validate_raw_output_path(output_path)
    paths = resolve_paths(args)
    rows = iter_rows(paths)
    if not bool(args.allow_duplicate_names):
        rows = enforce_unique_names(rows)
    write_jsonl(
        rows,
        output_path,
        source_name=SOURCE_NAME,
        input_paths=paths.values(),
        **output_options(args),
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Normalize non-branded raw sources to one JSONL"
    )
    parser.add_argument(
        "--inputs-dir",
        default="data/inputs",
        help="Base directory containing default source inputs (default: data/inputs)",
    )
    parser.add_argument("--australia-workbook", help="Path to Australian workbook")
    parser.add_argument("--canada-directory", help="Path to CNF directory")
    parser.add_argument("--cofid-workbook", help="Path to CoFID workbook")
    parser.add_argument("--nevo-workbook", help="Path to NEVO workbook")
    parser.add_argument("--new-zealand-workbook", help="Path to New Zealand workbook")
    parser.add_argument("--survey-json", help="Path to USDA survey JSON")
    parser.add_argument("--foundation-json", help="Path to USDA foundation JSON")
    parser.add_argument("--sr-legacy-json", help="Path to USDA SR legacy JSON")
    parser.add_argument("--nutrient-csv", help="Path to USDA nutrient.csv")
    parser.add_argument(
        "--allow-duplicate-names",
        action="store_true",
        help="Disable default raw name dedupe (by normalized name)",
    )
    add_quality_output_arguments(parser, source_name=SOURCE_NAME)
    args = parser.parse_args(argv)
    run_from_args(args)


if __name__ == "__main__":
    main()
