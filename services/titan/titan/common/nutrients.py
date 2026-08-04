from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from pathlib import Path

NUTRIENT_UNITS_FILENAME = "nutrient-units.json"


def tracked_nutrient_units(
    core_fields: Sequence[str],
    units_by_field: Mapping[str, str | None],
) -> list[dict[str, str]]:
    nutrients: list[dict[str, str]] = []
    for field in core_fields:
        unit = units_by_field.get(field)
        if isinstance(unit, str) and unit:
            nutrients.append({"field": field, "unit": unit})
    return nutrients


def write_tracked_nutrient_units(
    output_dir: Path,
    core_fields: Sequence[str],
    units_by_field: Mapping[str, str | None],
    *,
    filename: str = NUTRIENT_UNITS_FILENAME,
) -> Path:
    output_path = output_dir / filename
    payload = {
        "nutrients": tracked_nutrient_units(core_fields, units_by_field),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    return output_path
