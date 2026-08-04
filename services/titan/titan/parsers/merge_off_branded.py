from __future__ import annotations

import argparse
import math
import re
import sqlite3
import tempfile
from collections.abc import Iterable, Iterator
from fractions import Fraction
from pathlib import Path
from typing import Any

from titan.common.cli import add_quality_output_arguments, output_options, resolve_output_path
from titan.common.contracts import FieldSpec
from titan.common.json_stream import iter_json_source
from titan.common.output import write_jsonl
from titan.common.paths import BRANDED_FOODS_OUTPUT
from titan.common.units import sum_complete_numeric_components
from titan.nutrient_mapping import CORE_FIELD_UNITS, CORE_FOOD_FIELDS, USDA_FIELD_SPECS
from titan.parsers.usda import (
    build_usda_runtime_map,
    coerce_fdc_id,
    compute_net_carbohydrates,
    load_nutrient_rows,
    map_usda_food_row,
    validate_mapping_fields,
    validate_mapping_nutrients,
)

SOURCE_NAME = "branded-foods"
USDA_BRANDED_SOURCE = "usda_fooddata_central_branded"
OFF_SOURCE = "open_food_facts"
EXTRA_FIELD = "gtin"
BRAND_FIELD = "brand"
BRANDED_FIELDS = [*CORE_FOOD_FIELDS, EXTRA_FIELD, BRAND_FIELD]
RAW_OUTPUT_PREFIX = "raw-foods"

ROOT_KEY_BRANDED_FOODS = "BrandedFoods"

SODIUM_FROM_SALT_FACTOR = 0.3934

NON_NUTRIENT_FIELDS = {"source_id", "source", "name", "portions"}
CRITICAL_MACRO_FIELDS = {
    "calories",
    "protein",
    "total_fat",
    "carbohydrates_total",
    "carbohydrates_net_calculated",
    "fiber",
    "total_sugars",
}

PARENTHETICAL_SEGMENT = re.compile(r"\(([^()]*)\)")
NUMBER_AND_UNIT = re.compile(
    r"([-+]?\d+(?:[.,]\d+)?(?:/\d+(?:[.,]\d+)?)?)\s*([A-Za-z0-9%/.\u00b5 _-]+)"
)

OFF_FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "calories": ("energy-kcal", "energy", "energy-cal", "energy-kj"),
    "protein": ("proteins", "protein"),
    "total_fat": ("fat",),
    "carbohydrates_total": ("carbohydrates", "carbohydrates-total"),
    "fiber": ("fiber", "soluble-fiber", "insoluble-fiber"),
    "starch": ("starch",),
    "total_sugars": ("sugars",),
    "added_sugars": ("added-sugars", "en-sucres-ajoutes"),
    "cysteine": ("cysteine",),
    "histidine": ("histidine",),
    "isoleucine": ("isoleucine",),
    "leucine": ("leucine",),
    "lysine": ("lysine",),
    "methionine": ("methionine",),
    "phenylalanine": ("phenylalanine",),
    "threonine": ("threonine",),
    "tryptophan": ("tryptophan",),
    "tyrosine": ("tyrosine",),
    "valine": ("valine",),
    "monounsaturated_fat": ("monounsaturated-fat",),
    "polyunsaturated_fat": ("polyunsaturated-fat",),
    "omega_3_total_reported": ("omega-3-fat",),
    "omega_3_ala": ("alpha-linolenic-acid",),
    "omega_3_epa": ("omega-3-epa-eicosapentaenoic-acid", "eicosapentaenoic-acid"),
    "omega_3_dha": ("omega-3-dha-docosahexaenoic-acid", "docosahexaenoic-acid"),
    "omega_6_total_reported": ("omega-6-fat",),
    "omega_6_linoleic_acid": ("linoleic-acid",),
    "saturated_fat": ("saturated-fat",),
    "trans_fat": ("trans-fat",),
    "vitamin_a_retinol": ("retinol", "vitamin-a"),
    "vitamin_b1_thiamin": ("vitamin-b1",),
    "vitamin_b2_riboflavin": ("vitamin-b2",),
    "vitamin_b3_niacin": ("vitamin-pp", "niacin"),
    "vitamin_b5_pantothenic_acid": ("pantothenic-acid", "pantothenate"),
    "vitamin_b6": ("vitamin-b6",),
    "vitamin_b12_cobalamin": ("vitamin-b12",),
    "folate_total": ("vitamin-b9", "folates"),
    "vitamin_c_ascorbic_acid": ("vitamin-c",),
    "vitamin_d_calciferol": ("vitamin-d",),
    "vitamin_e_tocopherol": ("vitamin-e",),
    "vitamin_k_phylloquinone": ("phylloquinone",),
    "calcium": ("calcium",),
    "copper": ("copper",),
    "iron": ("iron",),
    "manganese": ("manganese",),
    "magnesium": ("magnesium",),
    "phosphorus": ("phosphorus",),
    "potassium": ("potassium",),
    "selenium": ("selenium",),
    "sodium": ("sodium",),
    "zinc": ("zinc",),
    "dietary_cholesterol": ("cholesterol",),
    "caffeine": ("caffeine",),
    "alcohol": ("alcohol",),
    "water": ("water",),
    "choline": ("choline",),
}

UNIT_ALIASES: dict[str, str] = {
    "g": "g",
    "gr": "g",
    "grs": "g",
    "grm": "g",
    "gram": "g",
    "grams": "g",
    "gm": "g",
    "kg": "kg",
    "kgs": "kg",
    "kgr": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "mg": "mg",
    "mgs": "mg",
    "milligram": "mg",
    "milligrams": "mg",
    "mcg": "mcg",
    "mcgs": "mcg",
    "ug": "mcg",
    "microgram": "mcg",
    "micrograms": "mcg",
    "iu": "iu",
    "international unit": "iu",
    "lb": "lb",
    "lbs": "lb",
    "pound": "lb",
    "pounds": "lb",
    "oz": "oz",
    "ozs": "oz",
    "onz": "oz",
    "fl oz": "fl oz",
    "floz": "fl oz",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    "oza": "fl oz",
    "l": "l",
    "ls": "l",
    "liter": "l",
    "liters": "l",
    "litre": "l",
    "litres": "l",
    "dl": "dl",
    "dls": "dl",
    "deciliter": "dl",
    "deciliters": "dl",
    "decilitre": "dl",
    "decilitres": "dl",
    "cl": "cl",
    "cls": "cl",
    "centiliter": "cl",
    "centiliters": "cl",
    "centilitre": "cl",
    "centilitres": "cl",
    "ml": "ml",
    "mls": "ml",
    "milliliter": "ml",
    "milliliters": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "gal": "gal",
    "gals": "gal",
    "gallon": "gal",
    "gallons": "gal",
    "metric teaspoon": "metric teaspoon",
    "kcal": "kcal",
    "kcals": "kcal",
    "kilocalorie": "kcal",
    "kilocalories": "kcal",
    "cal": "kcal",
    "cals": "kcal",
    "calorie": "kcal",
    "calories": "kcal",
    "kj": "kj",
    "kjs": "kj",
    "kilojoule": "kj",
    "kilojoules": "kj",
}

MASS_FACTORS_TO_G: dict[str, float] = {
    "kg": 1000.0,
    "g": 1.0,
    "mg": 0.001,
    "mcg": 0.000001,
    "lb": 453.59237,
    "oz": 28.349523125,
}

VOLUME_FACTORS_TO_ML: dict[str, float] = {
    "l": 1000.0,
    "dl": 100.0,
    "cl": 10.0,
    "ml": 1.0,
    "metric teaspoon": 5.0,
    "fl oz": 29.5735,
    "gal": 3785.41,
}

ENERGY_FACTORS_TO_KJ: dict[str, float] = {
    "kj": 1.0,
    "kcal": 4.184,
}


def has_display_name(value: Any) -> bool:
    return normalize_text(value) is not None


def is_invalid_nutrient_value(field: str, value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False

    numeric = float(value)
    if math.isnan(numeric) or math.isinf(numeric):
        return True
    if numeric < 0:
        return True
    return False


def sanitize_row_for_display(row: dict[str, Any]) -> int:
    invalid_macro_count = 0
    for field in CORE_FOOD_FIELDS:
        if field in NON_NUTRIENT_FIELDS:
            continue

        value = row.get(field)
        if not is_invalid_nutrient_value(field, value):
            continue

        row[field] = None
        if field in CRITICAL_MACRO_FIELDS:
            invalid_macro_count += 1

    # Derived fields must reflect the sanitized operands. A negative source fibre,
    # for example, cannot survive indirectly as net carbohydrate greater than total.
    row["carbohydrates_net_calculated"] = compute_net_carbohydrates(
        row.get("carbohydrates_total"), row.get("fiber")
    )
    row["omega_3_ala_epa_dha_sum"] = sum_complete_numeric_components(
        [row.get(field) for field in ("omega_3_ala", "omega_3_epa", "omega_3_dha")]
    )

    return invalid_macro_count


def enforce_display_safety(rows: Iterable[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    for row in rows:
        if not has_display_name(row.get("name")):
            continue

        invalid_macro_count = sanitize_row_for_display(row)
        if invalid_macro_count >= 2:
            continue

        yield row


def normalize_text(value: Any) -> str | None:
    if isinstance(value, str):
        # PostgreSQL text cannot represent U+0000. Treat a source string containing
        # it as unavailable instead of publishing a value the database cannot load.
        if "\x00" in value:
            return None
        candidate = value.strip()
        return candidate if candidate else None
    return None


def coerce_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None

    candidate = value.strip()
    if not candidate:
        return None

    candidate = candidate.replace("\u2212", "-")
    if "/" in candidate and " " not in candidate:
        try:
            return float(Fraction(candidate))
        except (ValueError, ZeroDivisionError):
            pass

    candidate = candidate.replace(",", ".")
    try:
        return float(candidate)
    except ValueError:
        return None


def normalize_unit_token(unit: Any) -> str | None:
    text = normalize_text(unit)
    if text is None:
        return None

    token = text.casefold()
    token = token.replace("&#181;", "u")
    token = token.replace("\u00b5", "u")
    token = token.replace("\u03bc", "u")
    token = token.replace(".", " ")
    token = token.replace("_", " ")
    token = token.replace("-", " ")
    token = " ".join(token.split())

    if "/" in token and token not in {"mmol/l", "mol/l"}:
        token = token.split("/", 1)[0].strip()

    canonical = UNIT_ALIASES.get(token)
    if canonical is not None:
        return canonical

    if (
        token in MASS_FACTORS_TO_G
        or token in VOLUME_FACTORS_TO_ML
        or token in ENERGY_FACTORS_TO_KJ
    ):
        return token
    return None


def convert_mass_value(
    value: float, source_unit: str, target_unit: str
) -> float | None:
    source_factor = MASS_FACTORS_TO_G.get(source_unit)
    target_factor = MASS_FACTORS_TO_G.get(target_unit)
    if source_factor is None or target_factor is None:
        return None
    grams = value * source_factor
    return grams / target_factor


def convert_energy_value(
    value: float, source_unit: str, target_unit: str
) -> float | None:
    source_factor = ENERGY_FACTORS_TO_KJ.get(source_unit)
    target_factor = ENERGY_FACTORS_TO_KJ.get(target_unit)
    if source_factor is None or target_factor is None:
        return None
    kilojoules = value * source_factor
    return kilojoules / target_factor


def convert_iu_value(value: float, target_unit: str, field: str) -> float | None:
    if field == "vitamin_d_calciferol":
        micrograms = value * 0.025
    elif field == "vitamin_a_retinol":
        micrograms = value * 0.3
    else:
        return None
    return convert_mass_value(micrograms, "mcg", target_unit)


def convert_nutrient_value(
    value: float,
    source_unit: str | None,
    target_unit: str | None,
    field: str,
) -> float | None:
    if target_unit is None:
        return float(value)
    if source_unit is None:
        return None
    if source_unit == target_unit:
        return float(value)

    if source_unit == "iu":
        return convert_iu_value(float(value), target_unit, field)

    converted_mass = convert_mass_value(float(value), source_unit, target_unit)
    if converted_mass is not None:
        return converted_mass

    converted_energy = convert_energy_value(float(value), source_unit, target_unit)
    if converted_energy is not None:
        return converted_energy

    return None


def normalize_gtin(value: Any) -> str | None:
    text = normalize_text(value)
    if text is None:
        return None
    digits = "".join(char for char in text if char.isdigit())
    if len(digits) not in {8, 12, 13, 14}:
        return None
    body, expected_check_digit = digits[:-1], int(digits[-1])
    weighted_sum = 0
    for position, character in enumerate(reversed(body), start=1):
        weighted_sum += int(character) * (3 if position % 2 == 1 else 1)
    actual_check_digit = (10 - weighted_sum % 10) % 10
    if actual_check_digit != expected_check_digit:
        return None
    return digits.zfill(14)


def gtin_match_keys(gtin: str | None) -> set[str]:
    normalized = normalize_gtin(gtin)
    return {normalized} if normalized is not None else set()


def build_empty_row(core_fields: list[str]) -> dict[str, Any]:
    row = {field: None for field in core_fields}
    row[EXTRA_FIELD] = None
    row[BRAND_FIELD] = None
    return row


def parse_amount_and_unit_from_text(text: str | None) -> tuple[float, str] | None:
    if text is None:
        return None

    candidates = [segment for segment in PARENTHETICAL_SEGMENT.findall(text)]
    candidates.append(text)

    for candidate in candidates:
        match = NUMBER_AND_UNIT.search(candidate)
        if match is None:
            continue

        amount = coerce_number(match.group(1))
        if amount is None or amount <= 0:
            continue

        normalized_unit = normalize_unit_token(match.group(2))
        if normalized_unit is None:
            continue

        mass_factor = MASS_FACTORS_TO_G.get(normalized_unit)
        if mass_factor is not None:
            return float(amount) * mass_factor, "g"

        volume_factor = VOLUME_FACTORS_TO_ML.get(normalized_unit)
        if volume_factor is not None:
            return float(amount) * volume_factor, "ml"

    return None


def build_usda_branded_portions(
    food_row: dict[str, Any],
) -> list[dict[str, Any]] | None:
    serving_size = coerce_number(food_row.get("servingSize"))
    serving_unit = normalize_unit_token(food_row.get("servingSizeUnit"))
    portion_name = normalize_text(food_row.get("householdServingFullText")) or "serving"

    if serving_size is not None and serving_size > 0 and serving_unit is not None:
        mass_factor = MASS_FACTORS_TO_G.get(serving_unit)
        if mass_factor is not None:
            return [
                {
                    "name": portion_name,
                    "amount": float(serving_size) * mass_factor,
                    "unit": "g",
                }
            ]

        volume_factor = VOLUME_FACTORS_TO_ML.get(serving_unit)
        if volume_factor is not None:
            return [
                {
                    "name": portion_name,
                    "amount": float(serving_size) * volume_factor,
                    "unit": "ml",
                }
            ]

    household_text = normalize_text(food_row.get("householdServingFullText"))
    parsed = parse_amount_and_unit_from_text(household_text)
    if parsed is None:
        return None

    amount, unit = parsed
    return [{"name": household_text or "serving", "amount": amount, "unit": unit}]


def build_off_portions(food_row: dict[str, Any]) -> list[dict[str, Any]] | None:
    serving_size = normalize_text(food_row.get("serving_size"))
    parsed = parse_amount_and_unit_from_text(serving_size)
    if parsed is None:
        return None

    amount, unit = parsed
    return [{"name": serving_size or "serving", "amount": amount, "unit": unit}]


def first_delimited_text(value: str | None) -> str | None:
    if value is None:
        return None
    for segment in re.split(r"[,;|]", value):
        candidate = normalize_text(segment)
        if candidate is not None:
            return candidate
    return None


def normalize_brand_tag(value: Any) -> str | None:
    text = normalize_text(value)
    if text is None:
        return None

    candidate = text
    if ":" in candidate:
        prefix, suffix = candidate.split(":", 1)
        if prefix.isalpha() and 1 <= len(prefix) <= 5 and suffix.strip():
            candidate = suffix

    return normalize_text(candidate)


def extract_usda_brand(food_row: dict[str, Any]) -> str | None:
    for key in ("brandName", "subbrandName", "brandOwner"):
        brand = normalize_text(food_row.get(key))
        if brand is not None:
            return brand
    return None


def extract_off_brand(food_row: dict[str, Any]) -> str | None:
    for key in ("brands", "brand", "brand_owner", "brands_imported"):
        value = food_row.get(key)
        if isinstance(value, list):
            for entry in value:
                if isinstance(entry, dict):
                    brand = first_delimited_text(
                        normalize_text(entry.get("text"))
                        or normalize_text(entry.get("name"))
                    )
                else:
                    brand = first_delimited_text(normalize_text(entry))
                if brand is not None:
                    return brand
            continue

        brand = first_delimited_text(normalize_text(value))
        if brand is not None:
            return brand

    brand_tags = food_row.get("brands_tags")
    if isinstance(brand_tags, list):
        for tag in brand_tags:
            brand = normalize_brand_tag(tag)
            if brand is not None:
                return brand
    else:
        tag_text = normalize_text(brand_tags)
        if tag_text is not None:
            for tag in re.split(r"[,;|]", tag_text):
                brand = normalize_brand_tag(tag)
                if brand is not None:
                    return brand

    return None


def extract_product_name(product_name: Any, language: Any) -> str | None:
    direct_name = normalize_text(product_name)
    if direct_name is not None:
        return direct_name
    if not isinstance(product_name, list):
        return None

    preferred_lang = normalize_text(language)
    entries: list[tuple[str | None, str]] = []
    for entry in product_name:
        if not isinstance(entry, dict):
            continue
        text = normalize_text(entry.get("text"))
        if text is None:
            continue
        entries.append((normalize_text(entry.get("lang")), text))

    if not entries:
        return None

    priorities = [preferred_lang, "en", "main"]
    for target_lang in priorities:
        if target_lang is None:
            continue
        for entry_lang, entry_text in entries:
            if entry_lang == target_lang:
                return entry_text

    return entries[0][1]


def nutriment_score(item: dict[str, Any]) -> int:
    score = 0
    if coerce_number(item.get("100g")) is not None:
        score += 4
    if coerce_number(item.get("value")) is not None:
        score += 2
    if coerce_number(item.get("serving")) is not None:
        score += 1
    if normalize_unit_token(item.get("unit")) is not None:
        score += 1
    return score


def build_off_nutriments_index(raw_nutriments: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(raw_nutriments, list):
        return {}

    indexed: dict[str, dict[str, Any]] = {}
    for item in raw_nutriments:
        if not isinstance(item, dict):
            continue
        name = normalize_text(item.get("name"))
        if name is None:
            continue
        key = name.casefold()
        current = indexed.get(key)
        if current is None or nutriment_score(item) > nutriment_score(current):
            indexed[key] = item
    return indexed


def extract_off_nutriment_value(
    item: dict[str, Any],
) -> tuple[float, str | None] | tuple[None, None]:
    for candidate_key in ("100g", "value", "serving"):
        amount = coerce_number(item.get(candidate_key))
        if amount is not None:
            return float(amount), normalize_unit_token(item.get("unit"))
    return None, None


def resolve_off_field_value(
    field: str,
    nutriments_by_name: dict[str, dict[str, Any]],
    target_units: dict[str, str | None],
) -> float | None:
    aliases = OFF_FIELD_ALIASES.get(field, ())
    target_unit = target_units.get(field)

    for alias in aliases:
        item = nutriments_by_name.get(alias.casefold())
        if item is None:
            continue
        amount, source_unit = extract_off_nutriment_value(item)
        if amount is None:
            continue
        converted = convert_nutrient_value(amount, source_unit, target_unit, field)
        if converted is not None:
            return converted

    if field == "sodium":
        salt_item = nutriments_by_name.get("salt")
        if salt_item is not None:
            salt_amount, salt_source_unit = extract_off_nutriment_value(salt_item)
            if salt_amount is not None:
                salt_grams = convert_mass_value(
                    salt_amount, salt_source_unit or "g", "g"
                )
                if salt_grams is not None:
                    sodium_grams = salt_grams * SODIUM_FROM_SALT_FACTOR
                    converted = convert_nutrient_value(
                        sodium_grams, "g", target_unit, field
                    )
                    if converted is not None:
                        return converted
    return None


def map_off_row(
    food_row: dict[str, Any],
    target_units: dict[str, str | None],
    core_fields: list[str],
) -> dict[str, Any]:
    normalized = build_empty_row(core_fields)
    normalized["source"] = OFF_SOURCE

    source_id = normalize_text(food_row.get("code"))
    normalized["source_id"] = source_id
    normalized[EXTRA_FIELD] = normalize_gtin(source_id)
    normalized[BRAND_FIELD] = extract_off_brand(food_row)
    normalized["name"] = extract_product_name(
        food_row.get("product_name"), food_row.get("lang")
    )
    normalized["portions"] = build_off_portions(food_row)

    nutriments_by_name = build_off_nutriments_index(food_row.get("nutriments"))

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
        normalized[target_field] = resolve_off_field_value(
            target_field, nutriments_by_name, target_units
        )

    normalized["carbohydrates_net_calculated"] = compute_net_carbohydrates(
        normalized.get("carbohydrates_total"), normalized.get("fiber")
    )

    omega_components = [
        normalized.get(field)
        for field in ("omega_3_ala", "omega_3_epa", "omega_3_dha")
    ]
    normalized["omega_3_ala_epa_dha_sum"] = sum_complete_numeric_components(
        omega_components
    )

    return normalized


def normalize_usda_unit(unit_name: str | None) -> str | None:
    if unit_name is None:
        return None
    return normalize_unit_token(unit_name)


def build_target_units(
    mapping: dict[str, Any], nutrient_rows_by_id: dict[int, dict[str, str]]
) -> dict[str, str | None]:
    target_units: dict[str, str | None] = {}
    for target_field in CORE_FOOD_FIELDS:
        expected_unit = CORE_FIELD_UNITS.get(target_field)
        entry = mapping.get(target_field)
        if not isinstance(entry, dict):
            target_units[target_field] = expected_unit
            continue

        nutrient_id = coerce_fdc_id(entry.get("fdc_id"))
        if nutrient_id is None:
            target_units[target_field] = expected_unit
            continue

        nutrient_row = nutrient_rows_by_id.get(nutrient_id)
        unit_name = nutrient_row.get("unit_name") if nutrient_row is not None else None
        usda_unit = normalize_usda_unit(unit_name)
        if (
            expected_unit is not None
            and usda_unit is not None
            and expected_unit != usda_unit
        ):
            raise RuntimeError(
                f"Core unit mismatch for {target_field}: expected {expected_unit!r}, "
                f"USDA derived {usda_unit!r}"
            )
        target_units[target_field] = (
            expected_unit if expected_unit is not None else usda_unit
        )
    return target_units


def iter_usda_source_rows(usda_branded_path: Path) -> Iterator[dict[str, Any]]:
    yield from iter_json_source(
        usda_branded_path,
        ROOT_KEY_BRANDED_FOODS,
        member_hint="branded",
    )


def map_usda_branded_row(
    food_row: dict[str, Any],
    mapping: dict[str, Any],
    core_fields: list[str],
) -> dict[str, Any]:
    normalized = map_usda_food_row(food_row, mapping, core_fields, USDA_BRANDED_SOURCE)
    if normalized.get("portions") is None:
        normalized["portions"] = build_usda_branded_portions(food_row)

    enriched = build_empty_row(core_fields)
    for field in core_fields:
        enriched[field] = normalized.get(field)
    enriched[EXTRA_FIELD] = normalize_gtin(food_row.get("gtinUpc"))
    enriched[BRAND_FIELD] = extract_usda_brand(food_row)
    return enriched


def iter_usda_branded_rows(
    usda_branded_path: Path,
    mapping: dict[str, Any],
    core_fields: list[str],
) -> Iterator[dict[str, Any]]:
    for food_row in iter_usda_source_rows(usda_branded_path):
        mapped_row = map_usda_branded_row(food_row, mapping, core_fields)
        if not has_display_name(mapped_row.get("name")):
            continue
        yield mapped_row


def iter_off_rows(
    off_parquet_path: Path,
    target_units: dict[str, str | None],
    core_fields: list[str],
    batch_size: int = 2048,
) -> Iterator[dict[str, Any]]:
    try:
        import pyarrow.parquet as pq
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "OFF parquet parsing requires `pyarrow`. Install it with `uv pip install pyarrow`."
        ) from exc

    parquet = pq.ParquetFile(off_parquet_path)
    schema_names = set(parquet.schema_arrow.names)

    required_columns = {"code", "nutriments"}
    missing_columns = sorted(required_columns - schema_names)
    if missing_columns:
        raise RuntimeError(
            "OFF parquet is missing required columns: " + ", ".join(missing_columns)
        )

    columns = [
        column
        for column in (
            "code",
            "lang",
            "product_name",
            "nutriments",
            "serving_size",
            "serving_quantity",
            "brands",
            "brands_tags",
            "brand",
            "brand_owner",
            "brands_imported",
        )
        if column in schema_names
    ]

    for batch in parquet.iter_batches(batch_size=batch_size, columns=columns):
        for food_row in batch.to_pylist():
            mapped_row = map_off_row(food_row, target_units, core_fields)
            if not has_display_name(mapped_row.get("name")):
                continue
            yield mapped_row


def merge_rows_with_usda_priority(
    usda_rows: Iterable[dict[str, Any]],
    off_rows: Iterable[dict[str, Any]],
) -> Iterator[dict[str, Any]]:
    with tempfile.TemporaryDirectory(prefix="regolith-gtin-dedupe-") as temp_dir:
        database = Path(temp_dir) / "gtins.sqlite"
        with sqlite3.connect(database) as connection:
            connection.execute("CREATE TABLE seen_gtins (gtin TEXT PRIMARY KEY)")
            for source_rows in (usda_rows, off_rows):
                for row in source_rows:
                    gtin = normalize_gtin(row.get(EXTRA_FIELD))
                    if gtin is None:
                        yield row
                        continue
                    cursor = connection.execute(
                        "INSERT OR IGNORE INTO seen_gtins (gtin) VALUES (?)", (gtin,)
                    )
                    if cursor.rowcount:
                        yield row
            connection.commit()


def enforce_unique_keys(
    rows: Iterable[dict[str, Any]],
    *,
    unique_upc: bool = True,
) -> Iterator[dict[str, Any]]:
    if not unique_upc:
        yield from rows
        return

    with tempfile.TemporaryDirectory(prefix="regolith-gtin-unique-") as temp_dir:
        database = Path(temp_dir) / "gtins.sqlite"
        with sqlite3.connect(database) as connection:
            connection.execute("CREATE TABLE seen_gtins (gtin TEXT PRIMARY KEY)")
            for row in rows:
                gtin = normalize_gtin(row.get(EXTRA_FIELD))
                if gtin is None:
                    yield row
                    continue
                cursor = connection.execute(
                    "INSERT OR IGNORE INTO seen_gtins (gtin) VALUES (?)", (gtin,)
                )
                if cursor.rowcount:
                    yield row
            connection.commit()


def iter_rows(
    usda_branded_path: Path,
    off_parquet_path: Path,
    nutrient_csv_path: Path,
    *,
    unique_upc: bool = True,
    field_specs: dict[str, FieldSpec] = USDA_FIELD_SPECS,
    core_fields: list[str] = CORE_FOOD_FIELDS,
) -> Iterator[dict[str, Any]]:
    mapping = build_usda_runtime_map(field_specs)
    nutrient_rows_by_id = load_nutrient_rows(nutrient_csv_path)
    validate_mapping_fields(mapping, core_fields)
    validate_mapping_nutrients(mapping, core_fields, nutrient_rows_by_id)

    target_units = build_target_units(mapping, nutrient_rows_by_id)

    usda_rows = enforce_display_safety(
        iter_usda_branded_rows(usda_branded_path, mapping, core_fields)
    )
    off_rows = enforce_display_safety(
        iter_off_rows(off_parquet_path, target_units, core_fields)
    )
    if unique_upc:
        yield from merge_rows_with_usda_priority(usda_rows, off_rows)
    else:
        yield from usda_rows
        yield from off_rows


def validate_branded_output_path(output_path: Path | None) -> None:
    if output_path is None:
        return

    output_name = output_path.name.casefold()
    if output_name.startswith(RAW_OUTPUT_PREFIX):
        raise RuntimeError(
            "Refusing to write branded rows to a raw-foods output path. "
            f"Use {BRANDED_FOODS_OUTPUT} or another branded-specific filename."
        )


def register_subparser(subparsers):
    parser = subparsers.add_parser(
        "merge-off-branded",
        help="Merge USDA branded JSON + Open Food Facts parquet into one normalized JSONL",
    )
    parser.add_argument(
        "--usda-branded",
        required=True,
        help="Path to USDA branded JSON or ZIP export",
    )
    parser.add_argument(
        "--off-parquet",
        required=True,
        help="Path to Open Food Facts parquet file",
    )
    parser.add_argument(
        "--nutrient-csv", required=True, help="Path to USDA nutrient.csv"
    )
    add_quality_output_arguments(parser, source_name=SOURCE_NAME)
    parser.set_defaults(handler=run_from_args)


def run_from_args(args) -> None:
    output_path = resolve_output_path(args.output, SOURCE_NAME)
    validate_branded_output_path(output_path)
    rows = iter_rows(
        Path(args.usda_branded),
        Path(args.off_parquet),
        Path(args.nutrient_csv),
        unique_upc=True,
    )
    write_jsonl(
        rows,
        output_path,
        source_name=SOURCE_NAME,
        input_paths=[Path(args.usda_branded), Path(args.off_parquet), Path(args.nutrient_csv)],
        **output_options(args),
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Merge USDA branded + Open Food Facts into one normalized JSONL"
    )
    parser.add_argument(
        "--usda-branded", required=True, help="Path to USDA branded JSON or ZIP"
    )
    parser.add_argument(
        "--off-parquet", required=True, help="Path to Open Food Facts parquet"
    )
    parser.add_argument(
        "--nutrient-csv", required=True, help="Path to USDA nutrient.csv"
    )
    add_quality_output_arguments(parser, source_name=SOURCE_NAME)
    args = parser.parse_args(argv)
    run_from_args(args)


if __name__ == "__main__":
    main()
