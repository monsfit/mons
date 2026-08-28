from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from nutrition_ingest.common.contracts import FieldKind, FieldSpec
from nutrition_ingest.common.units import convert_numeric_value, sum_complete_numeric_components
from nutrition_ingest.nutrient_mapping import CNF_FIELD_SPECS, CORE_FIELD_UNITS, CORE_FOOD_FIELDS

OMEGA3_FALLBACK_SYMBOLS = [
    "18:3cccn-3",
    "20:3n-3",
    "20:5n-3EPA",
    "22:5n-3DPA",
    "22:6n-3DHA",
]

OMEGA6_FALLBACK_SYMBOLS = [
    "18:2ccn-6",
    "18:3cccn-6",
    "20:3n-6",
    "20:4n-6",
    "22:4n-6",
]


def normalize_value(value: Any) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        try:
            return float(candidate.replace(",", ""))
        except ValueError:
            return candidate
    return value


def specs_to_symbol_map(field_specs: dict[str, FieldSpec]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for field, spec in field_specs.items():
        if spec.kind in {FieldKind.SOURCE, FieldKind.LITERAL} and isinstance(spec.source, str):
            mapping[field] = spec.source
        else:
            mapping[field] = ""
    return mapping


def load_food_rows(path: Path) -> tuple[list[str], dict[str, dict[str, str]]]:
    ordered_food_ids: list[str] = []
    rows_by_food_id: dict[str, dict[str, str]] = {}

    with path.open("r", encoding="latin-1", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            food_id_raw = row.get("FoodID")
            if food_id_raw is None:
                continue
            food_id = str(food_id_raw).strip()
            if not food_id:
                continue
            if food_id not in rows_by_food_id:
                ordered_food_ids.append(food_id)
            rows_by_food_id[food_id] = row

    return ordered_food_ids, rows_by_food_id


def load_nutrient_symbols(path: Path) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    nutrient_id_by_symbol: dict[str, str] = {}
    nutrient_by_symbol: dict[str, dict[str, str]] = {}

    with path.open("r", encoding="latin-1", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            symbol_raw = row.get("NutrientSymbol")
            nutrient_id_raw = row.get("NutrientID")
            if symbol_raw is None or nutrient_id_raw is None:
                continue
            symbol = symbol_raw.strip()
            nutrient_id = nutrient_id_raw.strip()
            if not symbol or not nutrient_id:
                continue
            nutrient_id_by_symbol[symbol] = nutrient_id
            nutrient_by_symbol[symbol] = row

    return nutrient_id_by_symbol, nutrient_by_symbol


def load_nutrient_amounts(path: Path) -> dict[str, dict[str, float]]:
    amounts_by_food_id: dict[str, dict[str, float]] = {}

    with path.open("r", encoding="latin-1", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            food_id_raw = row.get("FoodID")
            nutrient_id_raw = row.get("NutrientID")
            value_raw = row.get("NutrientValue")

            if food_id_raw is None or nutrient_id_raw is None:
                continue
            food_id = food_id_raw.strip()
            nutrient_id = nutrient_id_raw.strip()
            if not food_id or not nutrient_id:
                continue

            value = normalize_value(value_raw)
            if not isinstance(value, (int, float)):
                continue

            nutrients_for_food = amounts_by_food_id.setdefault(food_id, {})
            nutrients_for_food[nutrient_id] = float(value)

    return amounts_by_food_id


def validate_mapping_symbols(
    mapping: dict[str, str], nutrient_by_symbol: dict[str, dict[str, str]]
) -> list[str]:
    skip_fields = {"source_id", "source", "name", "portions"}
    missing_symbols: list[str] = []

    for target_field, source_symbol in mapping.items():
        if target_field in skip_fields or source_symbol == "":
            continue
        if source_symbol in {"FoodID", "FoodDescription"}:
            continue
        if source_symbol not in nutrient_by_symbol:
            missing_symbols.append(source_symbol)

    return sorted(set(missing_symbols))


def compute_net_carbohydrates(carbohydrates: Any, fiber: Any) -> float | None:
    if not isinstance(carbohydrates, (int, float)):
        return None
    if not isinstance(fiber, (int, float)):
        return None
    return max(0.0, float(carbohydrates) - float(fiber))


def sum_nutrient_symbols(
    nutrient_amounts: dict[str, float],
    nutrient_id_by_symbol: dict[str, str],
    nutrient_unit_by_symbol: dict[str, str | None],
    nutrient_symbols: list[str],
    target_unit: str | None,
    target_field: str,
) -> float | None:
    total = 0.0
    found_value = False

    for symbol in nutrient_symbols:
        nutrient_id = nutrient_id_by_symbol.get(symbol)
        if nutrient_id is None:
            continue
        value = nutrient_amounts.get(nutrient_id)
        if not isinstance(value, (int, float)):
            continue
        normalized_value = convert_numeric_value(
            value,
            nutrient_unit_by_symbol.get(symbol),
            target_unit,
            field=target_field,
        )
        if not isinstance(normalized_value, (int, float)):
            continue
        total += float(normalized_value)
        found_value = True

    return total if found_value else None


def map_cnf_row(
    food_row: dict[str, str],
    nutrient_amounts: dict[str, float],
    mapping: dict[str, str],
    nutrient_id_by_symbol: dict[str, str],
    nutrient_unit_by_symbol: dict[str, str | None],
    core_fields: list[str],
) -> dict[str, Any]:
    normalized: dict[str, Any] = {field: None for field in core_fields}

    for target_field, source_symbol in mapping.items():
        if target_field == "source":
            normalized[target_field] = source_symbol
            continue
        if target_field == "portions":
            normalized[target_field] = None
            continue
        if source_symbol == "":
            normalized[target_field] = None
            continue

        if source_symbol == "FoodID":
            food_id = food_row.get("FoodID")
            normalized[target_field] = str(food_id).strip() if food_id is not None else None
            continue

        if source_symbol == "FoodDescription":
            name = food_row.get("FoodDescription")
            normalized[target_field] = name.strip() if isinstance(name, str) else name
            continue

        nutrient_id = nutrient_id_by_symbol.get(source_symbol)
        if nutrient_id is None:
            normalized[target_field] = None
            continue

        value = nutrient_amounts.get(nutrient_id)
        if isinstance(value, (int, float)):
            value = convert_numeric_value(
                value,
                nutrient_unit_by_symbol.get(source_symbol),
                CORE_FIELD_UNITS.get(target_field),
                field=target_field,
            )
        normalized[target_field] = value

    normalized["carbohydrates_net_calculated"] = compute_net_carbohydrates(
        normalized.get("carbohydrates_total"), normalized.get("fiber")
    )
    omega_components = [
        normalized.get(field) for field in ("omega_3_ala", "omega_3_epa", "omega_3_dha")
    ]
    normalized["omega_3_ala_epa_dha_sum"] = sum_complete_numeric_components(omega_components)

    return normalized


def iter_rows(
    food_name_path: Path,
    nutrient_name_path: Path,
    nutrient_amount_path: Path,
    field_specs: dict[str, FieldSpec] = CNF_FIELD_SPECS,
    core_fields: list[str] = CORE_FOOD_FIELDS,
):
    mapping = specs_to_symbol_map(field_specs)

    ordered_food_ids, food_rows_by_id = load_food_rows(food_name_path)
    nutrient_id_by_symbol, nutrient_by_symbol = load_nutrient_symbols(nutrient_name_path)
    nutrient_unit_by_symbol: dict[str, str | None] = {}
    for symbol, row in nutrient_by_symbol.items():
        raw_unit = row.get("NutrientUnit")
        nutrient_unit_by_symbol[symbol] = raw_unit.strip() if isinstance(raw_unit, str) else None
    missing_symbols = validate_mapping_symbols(mapping, nutrient_by_symbol)
    if missing_symbols:
        raise RuntimeError(
            "Mapping references nutrient symbols not present in NUTRIENT NAME.csv: "
            + ", ".join(missing_symbols)
        )

    nutrient_amounts_by_food_id = load_nutrient_amounts(nutrient_amount_path)

    for food_id in ordered_food_ids:
        food_row = food_rows_by_id[food_id]
        nutrient_amounts = nutrient_amounts_by_food_id.get(food_id, {})
        mapped_row = map_cnf_row(
            food_row,
            nutrient_amounts,
            mapping,
            nutrient_id_by_symbol,
            nutrient_unit_by_symbol,
            core_fields,
        )
        if mapped_row.get("source_id") is None and mapped_row.get("name") is None:
            continue
        yield mapped_row
