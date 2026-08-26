from __future__ import annotations

import re
from typing import Any

UNIT_IN_PARENS_PATTERN = re.compile(r"\(([^()]*)\)")

UNIT_ALIASES: dict[str, str] = {
    "g": "g",
    "gram": "g",
    "grams": "g",
    "mg": "mg",
    "milligram": "mg",
    "milligrams": "mg",
    "mcg": "mcg",
    "ug": "mcg",
    "microgram": "mcg",
    "micrograms": "mcg",
    "kcal": "kcal",
    "kcalories": "kcal",
    "kilocalorie": "kcal",
    "kilocalories": "kcal",
    "cal": "kcal",
    "calorie": "kcal",
    "calories": "kcal",
    "kj": "kj",
    "kilojoule": "kj",
    "kilojoules": "kj",
    "iu": "iu",
}

MASS_FACTORS_TO_G: dict[str, float] = {
    "g": 1.0,
    "mg": 0.001,
    "mcg": 0.000001,
}

ENERGY_FACTORS_TO_KJ: dict[str, float] = {
    "kj": 1.0,
    "kcal": 4.184,
}


def sum_complete_numeric_components(values: list[Any]) -> float | None:
    total = 0.0
    for value in values:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        total += float(value)
    return total


def normalize_unit_token(unit: Any) -> str | None:
    if not isinstance(unit, str):
        return None

    token = unit.strip().casefold()
    if not token:
        return None

    token = token.replace("&#181;", "u")
    token = token.replace("\u00b5", "u")
    token = token.replace("\u03bc", "u")
    token = token.replace("_", " ")
    token = token.replace("-", " ")
    token = token.replace(".", " ")
    token = " ".join(token.split())

    if token in UNIT_ALIASES:
        return UNIT_ALIASES[token]

    if token.startswith("mcg") or token.startswith("ug"):
        return "mcg"
    if token.startswith("mg"):
        return "mg"
    if token == "g" or token.startswith("g "):
        return "g"
    if token.startswith("kcal") or token.startswith("calorie") or token.startswith("cal "):
        return "kcal"
    if token.startswith("kj"):
        return "kj"
    if token.startswith("iu"):
        return "iu"

    return None


def extract_unit_from_label(label: Any) -> str | None:
    if not isinstance(label, str):
        return None

    candidates = UNIT_IN_PARENS_PATTERN.findall(label)
    for candidate in reversed(candidates):
        normalized = normalize_unit_token(candidate)
        if normalized is not None:
            return normalized

    return normalize_unit_token(label)


def _convert_mass(value: float, source_unit: str, target_unit: str) -> float | None:
    source_factor = MASS_FACTORS_TO_G.get(source_unit)
    target_factor = MASS_FACTORS_TO_G.get(target_unit)
    if source_factor is None or target_factor is None:
        return None
    grams = value * source_factor
    return grams / target_factor


def _convert_energy(value: float, source_unit: str, target_unit: str) -> float | None:
    source_factor = ENERGY_FACTORS_TO_KJ.get(source_unit)
    target_factor = ENERGY_FACTORS_TO_KJ.get(target_unit)
    if source_factor is None or target_factor is None:
        return None
    kilojoules = value * source_factor
    return kilojoules / target_factor


def _convert_iu(value: float, target_unit: str, field: str | None) -> float | None:
    if target_unit != "mcg":
        return None
    if field == "vitamin_d_calciferol":
        return value * 0.025
    if field == "vitamin_a_retinol":
        return value * 0.3
    return None


def convert_numeric_value(
    value: Any,
    source_unit: str | None,
    target_unit: str | None,
    *,
    field: str | None = None,
) -> Any:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return value

    numeric = float(value)
    if target_unit is None:
        return numeric

    normalized_target = normalize_unit_token(target_unit)
    if normalized_target is None:
        raise RuntimeError(f"Unknown target unit for field {field!r}: {target_unit!r}")

    normalized_source = normalize_unit_token(source_unit)
    if normalized_source is None:
        raise RuntimeError(f"Unknown source unit for field {field!r}: {source_unit!r}")

    if normalized_source == normalized_target:
        return numeric

    if normalized_source == "iu":
        converted_iu = _convert_iu(numeric, normalized_target, field)
        if converted_iu is not None:
            return converted_iu
        raise RuntimeError(
            f"Cannot convert IU for field {field!r} to {normalized_target!r}"
        )

    converted_mass = _convert_mass(numeric, normalized_source, normalized_target)
    if converted_mass is not None:
        return converted_mass

    converted_energy = _convert_energy(numeric, normalized_source, normalized_target)
    if converted_energy is not None:
        return converted_energy

    raise RuntimeError(
        f"Unsupported unit conversion for field {field!r}: "
        f"{normalized_source!r} -> {normalized_target!r}"
    )
