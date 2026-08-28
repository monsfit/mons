from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from nutrition_ingest.common.contracts import FieldKind, FieldSpec
from nutrition_ingest.common.json_stream import iter_json_source
from nutrition_ingest.common.units import normalize_unit_token, sum_complete_numeric_components
from nutrition_ingest.nutrient_mapping import CORE_FOOD_FIELDS

SOURCE_LABELS = {
    "SurveyFoods": "usda_fooddata_central_survey",
    "FoundationFoods": "usda_fooddata_central_foundation",
    "SRLegacyFoods": "usda_fooddata_central_sr_legacy",
}


def build_usda_runtime_map(field_specs: dict[str, FieldSpec]) -> dict[str, Any]:
    mapping: dict[str, Any] = {}
    for field in CORE_FOOD_FIELDS:
        spec = field_specs.get(field)
        if spec is None:
            mapping[field] = ""
            continue

        if spec.kind in {FieldKind.SOURCE, FieldKind.LITERAL}:
            mapping[field] = spec.source if isinstance(spec.source, str) else ""
            continue

        if spec.kind == FieldKind.NUTRIENT_ID:
            metadata = spec.metadata if isinstance(spec.metadata, dict) else {}
            mapping[field] = {
                "fdc_id": spec.source if spec.source is not None else "",
                "nutrient_nbr": metadata.get("nutrient_nbr", ""),
                "name": metadata.get("name", ""),
            }
            if spec.fallback_sources:
                mapping[field]["fallback_fdc_ids"] = list(spec.fallback_sources)
            if spec.fallback_mode:
                mapping[field]["fallback_mode"] = spec.fallback_mode
            continue

        if spec.kind == FieldKind.COMPUTED:
            metadata = spec.metadata if isinstance(spec.metadata, dict) else {}
            mapping[field] = {
                "fdc_id": "",
                "nutrient_nbr": metadata.get("nutrient_nbr", ""),
                "name": metadata.get("name", "computed"),
            }
            if spec.fallback_sources:
                mapping[field]["fallback_fdc_ids"] = list(spec.fallback_sources)
            if spec.fallback_mode:
                mapping[field]["fallback_mode"] = spec.fallback_mode
            continue

        mapping[field] = ""

    return mapping


def normalize_value(value: Any) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        candidate = value.strip().replace(",", "")
        if not candidate:
            return None
        try:
            return float(candidate)
        except ValueError:
            return value.strip()
    return value


def normalize_text(value: Any) -> str | None:
    if isinstance(value, str):
        candidate = value.strip()
        return candidate or None
    return None


def normalize_source_id(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if float(value).is_integer():
            return str(int(value))
        return str(value)
    if isinstance(value, str):
        candidate = value.strip()
        return candidate or None
    return str(value)


def coerce_fdc_id(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if float(value).is_integer():
            return int(value)
        return None
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        if candidate.isdigit():
            return int(candidate)
        return None
    return None


def normalize_fallback_ids(value: Any) -> list[int]:
    if value is None:
        return []
    if not isinstance(value, list):
        return []
    fallback_ids: list[int] = []
    for entry in value:
        parsed = coerce_fdc_id(entry)
        if parsed is not None:
            fallback_ids.append(parsed)
    return fallback_ids


def load_nutrient_rows(path: Path) -> dict[int, dict[str, str]]:
    rows_by_id: dict[int, dict[str, str]] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            nutrient_id = coerce_fdc_id(row.get("id"))
            if nutrient_id is None:
                continue
            rows_by_id[nutrient_id] = row
    return rows_by_id


def validate_mapping_fields(mapping: dict[str, Any], core_fields: list[str]) -> None:
    missing_fields = [field for field in core_fields if field not in mapping]
    if missing_fields:
        raise RuntimeError(
            "USDA mapping is missing CORE_FOOD_FIELDS entries: " + ", ".join(sorted(missing_fields))
        )


def validate_mapping_nutrients(
    mapping: dict[str, Any],
    core_fields: list[str],
    nutrient_rows_by_id: dict[int, dict[str, str]],
) -> None:
    errors: list[str] = []

    for target_field in core_fields:
        if target_field in {"source_id", "source", "name", "portions"}:
            continue

        mapping_entry = mapping.get(target_field)
        if mapping_entry is None or mapping_entry == "":
            continue
        if not isinstance(mapping_entry, dict):
            errors.append(f"{target_field}: expected dict nutrient mapping entry")
            continue

        nutrient_id = coerce_fdc_id(mapping_entry.get("fdc_id"))
        fallback_ids = normalize_fallback_ids(mapping_entry.get("fallback_fdc_ids"))

        declared_name = normalize_text(mapping_entry.get("name"))
        is_computed = declared_name is not None and declared_name.casefold().startswith("computed:")
        if nutrient_id is None and not fallback_ids and not is_computed:
            errors.append(f"{target_field}: must define fdc_id or fallback_fdc_ids")

        if nutrient_id is not None:
            nutrient_row = nutrient_rows_by_id.get(nutrient_id)
            if nutrient_row is None:
                errors.append(f"{target_field}: fdc_id {nutrient_id} not found in nutrient.csv")
            else:
                declared_nutrient_number = normalize_text(mapping_entry.get("nutrient_nbr"))
                declared_name = normalize_text(mapping_entry.get("name"))

                source_nutrient_number = normalize_text(nutrient_row.get("nutrient_nbr"))
                source_name = normalize_text(nutrient_row.get("name"))

                if (
                    declared_nutrient_number is not None
                    and source_nutrient_number is not None
                    and declared_nutrient_number != source_nutrient_number
                ):
                    errors.append(
                        f"{target_field}: nutrient_nbr mismatch for fdc_id {nutrient_id} "
                        f"(declared={declared_nutrient_number}, source={source_nutrient_number})"
                    )
                if (
                    declared_name is not None
                    and source_name is not None
                    and not declared_name.casefold().startswith("computed:")
                    and declared_name != source_name
                ):
                    errors.append(
                        f"{target_field}: nutrient name mismatch for fdc_id {nutrient_id} "
                        f"(declared={declared_name}, source={source_name})"
                    )

        for fallback_id in fallback_ids:
            if fallback_id not in nutrient_rows_by_id:
                errors.append(
                    f"{target_field}: fallback fdc_id {fallback_id} not found in nutrient.csv"
                )

    if errors:
        raise RuntimeError("Invalid USDA mapping:\n- " + "\n- ".join(errors))


def validate_core_field_units_against_usda(
    mapping: dict[str, Any],
    nutrient_rows_by_id: dict[int, dict[str, str]],
    core_field_units: dict[str, str | None],
) -> None:
    errors: list[str] = []
    for target_field, expected_unit in core_field_units.items():
        if expected_unit is None:
            continue
        mapping_entry = mapping.get(target_field)
        if not isinstance(mapping_entry, dict):
            continue
        nutrient_id = coerce_fdc_id(mapping_entry.get("fdc_id"))
        if nutrient_id is None:
            continue
        nutrient_row = nutrient_rows_by_id.get(nutrient_id)
        if nutrient_row is None:
            continue
        source_unit = normalize_unit_token(nutrient_row.get("unit_name"))
        if source_unit is None:
            errors.append(
                f"{target_field}: unable to normalize USDA unit_name {nutrient_row.get('unit_name')!r}"
            )
            continue
        if source_unit != expected_unit:
            errors.append(
                f"{target_field}: expected core unit {expected_unit!r}, USDA has {source_unit!r}"
            )
    if errors:
        raise RuntimeError("Invalid core unit contract:\n- " + "\n- ".join(errors))


def compute_net_carbohydrates(carbohydrates: Any, fiber: Any) -> float | None:
    if not isinstance(carbohydrates, (int, float)):
        return None
    if not isinstance(fiber, (int, float)):
        return None
    return max(0.0, float(carbohydrates) - float(fiber))


def normalize_portion_name(portion: dict[str, Any]) -> str:
    portion_description = normalize_text(portion.get("portionDescription"))
    if portion_description is not None:
        return portion_description

    modifier = normalize_text(portion.get("modifier"))
    if modifier is not None and not modifier.isdigit():
        return modifier

    measure_unit = portion.get("measureUnit")
    if isinstance(measure_unit, dict):
        measure_name = normalize_text(measure_unit.get("name"))
        if measure_name is not None:
            return measure_name

    if modifier is not None:
        return modifier

    return "serving"


def normalize_portions(raw_portions: Any) -> list[dict[str, Any]] | None:
    if not isinstance(raw_portions, list):
        return None

    normalized: list[dict[str, Any]] = []
    seen: set[tuple[str, float]] = set()

    for raw_portion in raw_portions:
        if not isinstance(raw_portion, dict):
            continue

        gram_weight = normalize_value(raw_portion.get("gramWeight"))
        if not isinstance(gram_weight, (int, float)):
            continue
        gram_weight = float(gram_weight)
        if gram_weight <= 0:
            continue

        name = normalize_portion_name(raw_portion)
        dedupe_key = (name, gram_weight)
        if dedupe_key in seen:
            continue

        normalized.append({"name": name, "amount": gram_weight, "unit": "g"})
        seen.add(dedupe_key)

    return normalized or None


def build_nutrient_amounts(food_row: dict[str, Any]) -> dict[int, float]:
    nutrients = food_row.get("foodNutrients")
    if not isinstance(nutrients, list):
        return {}

    amounts_by_id: dict[int, float] = {}
    for nutrient_row in nutrients:
        if not isinstance(nutrient_row, dict):
            continue

        nutrient = nutrient_row.get("nutrient")
        if not isinstance(nutrient, dict):
            continue

        nutrient_id = coerce_fdc_id(nutrient.get("id"))
        amount = normalize_value(nutrient_row.get("amount"))
        if nutrient_id is None or not isinstance(amount, (int, float)):
            continue

        amounts_by_id[nutrient_id] = float(amount)

    return amounts_by_id


def resolve_fallback_value(
    nutrient_amounts: dict[int, float], fallback_ids: list[int], fallback_mode: str
) -> float | None:
    if not fallback_ids:
        return None

    if fallback_mode == "sum":
        total = 0.0
        found_value = False
        for fallback_id in fallback_ids:
            value = nutrient_amounts.get(fallback_id)
            if not isinstance(value, (int, float)):
                continue
            total += float(value)
            found_value = True
        return total if found_value else None

    for fallback_id in fallback_ids:
        value = nutrient_amounts.get(fallback_id)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def resolve_nutrient_value(
    mapping_entry: dict[str, Any], nutrient_amounts: dict[int, float]
) -> float | None:
    nutrient_id = coerce_fdc_id(mapping_entry.get("fdc_id"))
    if nutrient_id is not None:
        value = nutrient_amounts.get(nutrient_id)
        if isinstance(value, (int, float)):
            return float(value)

    fallback_ids = normalize_fallback_ids(mapping_entry.get("fallback_fdc_ids"))
    fallback_mode = str(mapping_entry.get("fallback_mode", "first")).strip().casefold()
    if fallback_mode not in {"first", "sum"}:
        fallback_mode = "first"

    return resolve_fallback_value(nutrient_amounts, fallback_ids, fallback_mode)


def map_usda_food_row(
    food_row: dict[str, Any],
    mapping: dict[str, Any],
    core_fields: list[str],
    source_label: str,
) -> dict[str, Any]:
    normalized: dict[str, Any] = {field: None for field in core_fields}

    source_id_key = mapping.get("source_id")
    if not isinstance(source_id_key, str) or not source_id_key:
        source_id_key = "fdcId"
    source_id_value = food_row.get(source_id_key)
    normalized["source_id"] = normalize_source_id(source_id_value)

    source_name_key = mapping.get("name")
    if not isinstance(source_name_key, str) or not source_name_key:
        source_name_key = "description"
    source_name_value = food_row.get(source_name_key)
    normalized["name"] = normalize_text(source_name_value)

    normalized["source"] = source_label

    portions_key = mapping.get("portions")
    if not isinstance(portions_key, str) or not portions_key:
        portions_key = "foodPortions"
    raw_portions = food_row.get(portions_key)
    normalized["portions"] = normalize_portions(raw_portions)

    nutrient_amounts = build_nutrient_amounts(food_row)

    for target_field in core_fields:
        if target_field in {
            "source_id",
            "source",
            "name",
            "portions",
            "carbohydrates_net_calculated",
            "omega_3_ala_epa_dha_sum",
        }:
            continue

        mapping_entry = mapping.get(target_field)
        if not isinstance(mapping_entry, dict):
            normalized[target_field] = None
            continue
        if target_field == "calories":
            energy_ids = (
                (2048, 2047, 1008)
                if source_label == SOURCE_LABELS["FoundationFoods"]
                else (1008, 2048, 2047)
            )
            normalized[target_field] = next(
                (
                    nutrient_amounts[nutrient_id]
                    for nutrient_id in energy_ids
                    if nutrient_id in nutrient_amounts
                ),
                None,
            )
        else:
            normalized[target_field] = resolve_nutrient_value(mapping_entry, nutrient_amounts)

    normalized["carbohydrates_net_calculated"] = compute_net_carbohydrates(
        normalized.get("carbohydrates_total"), normalized.get("fiber")
    )
    omega_components = [
        normalized.get(field) for field in ("omega_3_ala", "omega_3_epa", "omega_3_dha")
    ]
    normalized["omega_3_ala_epa_dha_sum"] = sum_complete_numeric_components(omega_components)
    return normalized


def iter_dataset_rows(
    json_path: Path,
    root_key: str,
    source_label: str,
    mapping: dict[str, Any],
    core_fields: list[str],
):
    for food_row in iter_json_source(json_path, root_key, member_hint=root_key):
        mapped_row = map_usda_food_row(food_row, mapping, core_fields, source_label)
        if mapped_row.get("source_id") is None and mapped_row.get("name") is None:
            continue
        yield mapped_row


def iter_all_usda_rows(
    survey_path: Path,
    foundation_path: Path,
    sr_legacy_path: Path,
    mapping: dict[str, Any],
    core_fields: list[str],
):
    dataset_specs = [
        (survey_path, "SurveyFoods"),
        (foundation_path, "FoundationFoods"),
        (sr_legacy_path, "SRLegacyFoods"),
    ]
    for json_path, root_key in dataset_specs:
        source_label = SOURCE_LABELS[root_key]
        yield from iter_dataset_rows(json_path, root_key, source_label, mapping, core_fields)
