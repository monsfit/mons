from __future__ import annotations

import json
import math
import sqlite3
import tempfile
import unicodedata
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any, TypeGuard

from nutrition_ingest.common.schema import NUTRIENT_FIELDS
from nutrition_ingest.nutrient_mapping import CORE_FIELD_UNITS, CORE_FOOD_FIELDS, USDA_FIELD_SPECS

from . import australia as australia_parser
from . import canada as canada_parser
from . import cofid as cofid_parser
from . import nevo as nevo_parser
from . import new_zealand as new_zealand_parser
from . import usda as usda_parser

MAX_DISPLAY_NAME_LENGTH = 160
MAX_CALORIES_PER_100G = 1000.0
MAX_MACRO_GRAMS_PER_100G = 100.0
MAX_MACRO_TOTAL_PER_100G = 120.0
SEMANTIC_NAME_PUNCTUATION = frozenset({"/", "%", "+", "<", ">"})


def build_default_paths(inputs_dir: Path) -> dict[str, Path]:
    return {
        "australia_workbook": inputs_dir / "australian-food-composition-database.xlsx",
        "canada_directory": inputs_dir / "canadian-nutrient-files",
        "cofid_workbook": inputs_dir / "CoFID.xlsx",
        "nevo_workbook": inputs_dir / "dutch-nutrient-database" / "NEVO2025_v9.0.xlsx",
        "new_zealand_workbook": inputs_dir / "new-zealand-food-concise.xlsx",
        "survey_json": inputs_dir / "FoodData_Central_survey_food_json.json",
        "foundation_json": inputs_dir / "FoodData_Central_foundation_food_json_2025-12-18.json",
        "sr_legacy_json": inputs_dir / "FoodData_Central_sr_legacy_food_json_2018-04.json",
        "nutrient_csv": inputs_dir / "FoodData_Central_csv_2025-04-24" / "nutrient.csv",
    }


def iter_rows(paths: dict[str, Path]):
    yield from enforce_defined_names(australia_parser.iter_rows(paths["australia_workbook"]))
    yield from enforce_defined_names(
        canada_parser.iter_rows(
            paths["canada_directory"] / "FOOD NAME.csv",
            paths["canada_directory"] / "NUTRIENT NAME.csv",
            paths["canada_directory"] / "NUTRIENT AMOUNT.csv",
        )
    )
    yield from enforce_defined_names(cofid_parser.iter_rows(paths["cofid_workbook"]))
    yield from enforce_defined_names(nevo_parser.iter_rows(paths["nevo_workbook"]))
    yield from enforce_defined_names(new_zealand_parser.iter_rows(paths["new_zealand_workbook"]))

    runtime_map = usda_parser.build_usda_runtime_map(USDA_FIELD_SPECS)
    nutrient_rows = usda_parser.load_nutrient_rows(paths["nutrient_csv"])
    usda_parser.validate_mapping_fields(runtime_map, CORE_FOOD_FIELDS)
    usda_parser.validate_mapping_nutrients(runtime_map, CORE_FOOD_FIELDS, nutrient_rows)
    usda_parser.validate_core_field_units_against_usda(runtime_map, nutrient_rows, CORE_FIELD_UNITS)

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
    normalized = unicodedata.normalize("NFKC", value.casefold())
    key = " ".join(
        "".join(
            character
            if character.isalnum() or character in SEMANTIC_NAME_PUNCTUATION
            else " "
            for character in normalized
        ).split()
    )
    return key or None


def has_defined_name(value: Any) -> bool:
    return normalize_name_key(value) is not None


def enforce_defined_names(rows: Iterable[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    for row in rows:
        if has_defined_name(row.get("name")):
            yield row


def has_display_name(value: Any) -> bool:
    return (
        isinstance(value, str)
        and bool(value.strip())
        and len(value) <= MAX_DISPLAY_NAME_LENGTH
        and sum(character.isalpha() for character in value) >= 2
    )


def resolved_carbohydrates(row: dict[str, Any]) -> Any:
    total = row.get("carbohydrates_total")
    return total if total is not None else row.get("carbohydrates_available")


def has_valid_core_nutrition(row: dict[str, Any]) -> bool:
    calories_value = row.get("calories")
    protein_value = row.get("protein")
    fat_value = row.get("total_fat")
    carbohydrates_value = resolved_carbohydrates(row)
    if not _is_valid_nutrient_value(calories_value):
        return False
    if not _is_valid_nutrient_value(protein_value):
        return False
    if not _is_valid_nutrient_value(fat_value):
        return False
    if not _is_valid_nutrient_value(carbohydrates_value):
        return False

    calories = float(calories_value)
    protein = float(protein_value)
    fat = float(fat_value)
    carbohydrates = float(carbohydrates_value)
    macros = (protein, fat, carbohydrates)
    if not 0 <= calories <= MAX_CALORIES_PER_100G:
        return False
    if any(not 0 <= value <= MAX_MACRO_GRAMS_PER_100G for value in macros):
        return False
    if sum(macros) > MAX_MACRO_TOTAL_PER_100G:
        return False
    return calories > 0 or sum(macros) == 0


def enforce_display_safety(rows: Iterable[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    for row in rows:
        if has_display_name(row.get("name")) and has_valid_core_nutrition(row):
            yield row


def _is_valid_nutrient_value(value: Any) -> TypeGuard[int | float]:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return not math.isnan(value)
    return False


def nutrient_completeness_score(row: dict[str, Any]) -> int:
    return sum(1 for field in NUTRIENT_FIELDS if _is_valid_nutrient_value(row.get(field)))


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
