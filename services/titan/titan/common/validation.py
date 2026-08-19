from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any, Literal

from titan.common.schema import CORE_FOOD_FIELDS, NUTRIENT_FIELDS

GTIN_PATTERN = re.compile(r"^\d{14}$")


@dataclass(frozen=True)
class ValidationIssue:
    kind: Literal["contract", "source_value", "warning"]
    code: str
    field: str | None
    message: str
    value: Any = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "code": self.code,
            "field": self.field,
            "message": self.message,
            "value": safe_json_value(self.value),
        }


def safe_json_value(value: Any) -> Any:
    if isinstance(value, float) and not math.isfinite(value):
        return repr(value)
    if isinstance(value, dict):
        return {str(key): safe_json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [safe_json_value(item) for item in value]
    return value


def _validate_portions(value: Any) -> list[ValidationIssue]:
    if value is None:
        return []
    if not isinstance(value, list):
        return [ValidationIssue("contract", "invalid_portions_type", "portions", "Portions must be an array or null", value)]
    issues: list[ValidationIssue] = []
    for index, portion in enumerate(value):
        if not isinstance(portion, dict) or set(portion) != {"name", "amount", "unit"}:
            issues.append(ValidationIssue("contract", "invalid_portion_shape", "portions", f"Portion {index} has an invalid shape", portion))
            continue
        name = portion.get("name")
        amount = portion.get("amount")
        unit = portion.get("unit")
        if not isinstance(name, str) or not name.strip():
            issues.append(ValidationIssue("source_value", "invalid_portion_name", "portions", f"Portion {index} has no name", name))
        elif "\x00" in name:
            issues.append(ValidationIssue("contract", "nul_in_text", "portions", f"Portion {index} name contains U+0000", name))
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or not math.isfinite(float(amount)) or float(amount) <= 0:
            issues.append(ValidationIssue("source_value", "invalid_portion_amount", "portions", f"Portion {index} amount must be finite and positive", amount))
        if unit not in {"g", "ml"}:
            issues.append(ValidationIssue("contract", "invalid_portion_unit", "portions", f"Portion {index} unit must be g or ml", unit))
    return issues


def validate_normalized_row(row: Any, *, branded: bool = False) -> list[ValidationIssue]:
    expected = set(CORE_FOOD_FIELDS)
    if branded:
        expected.update({"gtin", "brand"})
    if not isinstance(row, dict):
        return [ValidationIssue("contract", "invalid_row_type", None, "Normalized row must be an object", row)]

    issues: list[ValidationIssue] = []
    actual = set(row)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        issues.append(
            ValidationIssue(
                "contract",
                "invalid_row_fields",
                None,
                f"Row fields do not match schema; missing={missing}, extra={extra}",
            )
        )

    for field in ("source_id", "source", "name"):
        value = row.get(field)
        if not isinstance(value, str) or not value.strip():
            issues.append(ValidationIssue("source_value", f"invalid_{field}", field, f"{field} must be a nonblank string", value))
        elif "\x00" in value:
            issues.append(ValidationIssue("contract", "nul_in_text", field, f"{field} contains U+0000", value))

    issues.extend(_validate_portions(row.get("portions")))

    for field in NUTRIENT_FIELDS:
        value = row.get(field)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            issues.append(ValidationIssue("contract", "invalid_nutrient_type", field, "Nutrient must be numeric or null", value))
            continue
        numeric = float(value)
        if not math.isfinite(numeric):
            issues.append(ValidationIssue("source_value", "nonfinite_nutrient", field, "Nutrient must be finite", value))
        elif numeric < 0:
            issues.append(ValidationIssue("source_value", "negative_nutrient", field, "Nutrient must be nonnegative", value))

    net = row.get("carbohydrates_net_calculated")
    total = row.get("carbohydrates_total")
    if isinstance(net, (int, float)) and isinstance(total, (int, float)) and float(net) > float(total):
        issues.append(ValidationIssue("contract", "net_carbs_exceed_total", "carbohydrates_net_calculated", "Calculated net carbohydrate cannot exceed total carbohydrate", net))

    if branded:
        gtin = row.get("gtin")
        brand = row.get("brand")
        if gtin is not None and (not isinstance(gtin, str) or GTIN_PATTERN.fullmatch(gtin) is None):
            issues.append(ValidationIssue("contract", "invalid_gtin", "gtin", "GTIN must be 14 digits or null", gtin))
        if brand is not None and not isinstance(brand, str):
            issues.append(ValidationIssue("contract", "invalid_brand", "brand", "Brand must be a string or null", brand))
        elif isinstance(brand, str) and "\x00" in brand:
            issues.append(ValidationIssue("contract", "nul_in_text", "brand", "Brand contains U+0000", brand))

    return issues
