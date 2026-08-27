from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Literal, TypedDict

SCHEMA_VERSION = "2.0.0"
NUTRIENT_BASIS_AMOUNT = 100.0
NUTRIENT_BASIS_UNIT = "g"

NON_NUTRIENT_FIELDS = ("source_id", "source", "name", "portions")


@dataclass(frozen=True)
class FieldDefinition:
    name: str
    unit: str | None
    description: str
    value_kind: Literal["identity", "direct", "derived"] = "direct"


class Portion(TypedDict):
    name: str
    amount: float
    unit: Literal["g", "ml"]


FIELD_DEFINITIONS: tuple[FieldDefinition, ...] = (
    FieldDefinition("source_id", None, "Stable identifier from the source dataset", "identity"),
    FieldDefinition("source", None, "Normalized source dataset identifier", "identity"),
    FieldDefinition("name", None, "Source food or product name", "identity"),
    FieldDefinition("portions", None, "Optional household portions", "identity"),
    FieldDefinition("calories", "kcal", "Food energy per 100 g"),
    FieldDefinition("protein", "g", "Protein per 100 g"),
    FieldDefinition("total_fat", "g", "Total fat per 100 g"),
    FieldDefinition("carbohydrates_total", "g", "Source-reported total carbohydrate per 100 g"),
    FieldDefinition("carbohydrates_available", "g", "Source-reported available carbohydrate per 100 g"),
    FieldDefinition(
        "carbohydrates_net_calculated",
        "g",
        "Calculated total carbohydrate minus dietary fibre per 100 g",
        "derived",
    ),
    FieldDefinition("fiber", "g", "Dietary fibre per 100 g"),
    FieldDefinition("starch", "g", "Starch per 100 g"),
    FieldDefinition("total_sugars", "g", "Total sugars per 100 g"),
    FieldDefinition("added_sugars", "g", "Added sugars per 100 g"),
    FieldDefinition("cysteine", "g", "Cysteine per 100 g"),
    FieldDefinition("histidine", "g", "Histidine per 100 g"),
    FieldDefinition("isoleucine", "g", "Isoleucine per 100 g"),
    FieldDefinition("leucine", "g", "Leucine per 100 g"),
    FieldDefinition("lysine", "g", "Lysine per 100 g"),
    FieldDefinition("methionine", "g", "Methionine per 100 g"),
    FieldDefinition("phenylalanine", "g", "Phenylalanine per 100 g"),
    FieldDefinition("threonine", "g", "Threonine per 100 g"),
    FieldDefinition("tryptophan", "g", "Tryptophan per 100 g"),
    FieldDefinition("tyrosine", "g", "Tyrosine per 100 g"),
    FieldDefinition("valine", "g", "Valine per 100 g"),
    FieldDefinition("monounsaturated_fat", "g", "Total monounsaturated fat per 100 g"),
    FieldDefinition("polyunsaturated_fat", "g", "Total polyunsaturated fat per 100 g"),
    FieldDefinition("omega_3_total_reported", "g", "Source-reported total omega-3 fat per 100 g"),
    FieldDefinition(
        "omega_3_ala_epa_dha_sum",
        "g",
        "ALA + EPA + DHA per 100 g, present only when all three components exist",
        "derived",
    ),
    FieldDefinition("omega_3_ala", "g", "Alpha-linolenic acid per 100 g"),
    FieldDefinition("omega_3_epa", "g", "Eicosapentaenoic acid per 100 g"),
    FieldDefinition("omega_3_dha", "g", "Docosahexaenoic acid per 100 g"),
    FieldDefinition("omega_6_total_reported", "g", "Source-reported total omega-6 fat per 100 g"),
    FieldDefinition("omega_6_linoleic_acid", "g", "Linoleic acid per 100 g"),
    FieldDefinition("saturated_fat", "g", "Total saturated fat per 100 g"),
    FieldDefinition("trans_fat", "g", "Total trans fat per 100 g"),
    FieldDefinition("vitamin_a_retinol", "mcg", "Retinol per 100 g"),
    FieldDefinition("vitamin_b1_thiamin", "mg", "Thiamin per 100 g"),
    FieldDefinition("vitamin_b2_riboflavin", "mg", "Riboflavin per 100 g"),
    FieldDefinition("vitamin_b3_niacin", "mg", "Niacin per 100 g"),
    FieldDefinition("vitamin_b5_pantothenic_acid", "mg", "Pantothenic acid per 100 g"),
    FieldDefinition("vitamin_b6", "mg", "Vitamin B6 per 100 g"),
    FieldDefinition("vitamin_b12_cobalamin", "mcg", "Vitamin B12 per 100 g"),
    FieldDefinition("folate_total", "mcg", "Total folate per 100 g"),
    FieldDefinition("folate_dfe", "mcg", "Dietary folate equivalents per 100 g"),
    FieldDefinition("vitamin_c_ascorbic_acid", "mg", "Vitamin C per 100 g"),
    FieldDefinition("vitamin_d_calciferol", "mcg", "Vitamin D per 100 g"),
    FieldDefinition("vitamin_e_tocopherol", "mg", "Vitamin E as tocopherol per 100 g"),
    FieldDefinition("vitamin_k_phylloquinone", "mcg", "Phylloquinone per 100 g"),
    FieldDefinition("calcium", "mg", "Calcium per 100 g"),
    FieldDefinition("copper", "mg", "Copper per 100 g"),
    FieldDefinition("iron", "mg", "Iron per 100 g"),
    FieldDefinition("manganese", "mg", "Manganese per 100 g"),
    FieldDefinition("magnesium", "mg", "Magnesium per 100 g"),
    FieldDefinition("phosphorus", "mg", "Phosphorus per 100 g"),
    FieldDefinition("potassium", "mg", "Potassium per 100 g"),
    FieldDefinition("selenium", "mcg", "Selenium per 100 g"),
    FieldDefinition("sodium", "mg", "Sodium per 100 g"),
    FieldDefinition("zinc", "mg", "Zinc per 100 g"),
    FieldDefinition("dietary_cholesterol", "mg", "Dietary cholesterol per 100 g"),
    FieldDefinition("caffeine", "mg", "Caffeine per 100 g"),
    FieldDefinition("alcohol", "g", "Alcohol per 100 g"),
    FieldDefinition("water", "g", "Water per 100 g"),
    FieldDefinition("choline", "mg", "Choline per 100 g"),
)

CORE_FOOD_FIELDS = [definition.name for definition in FIELD_DEFINITIONS]
CORE_FIELD_UNITS = {definition.name: definition.unit for definition in FIELD_DEFINITIONS}
NUTRIENT_FIELDS = [field for field in CORE_FOOD_FIELDS if field not in NON_NUTRIENT_FIELDS]

BRANDED_FIELD_DEFINITIONS: tuple[FieldDefinition, ...] = (
    FieldDefinition("brand", None, "Product brand", "identity"),
    FieldDefinition("gtin", None, "Normalized 14-digit Global Trade Item Number", "identity"),
)


def field_definitions_by_name() -> Mapping[str, FieldDefinition]:
    return {definition.name: definition for definition in FIELD_DEFINITIONS}


def json_schema(extra_fields: Sequence[FieldDefinition] = ()) -> dict[str, Any]:
    definitions = (*FIELD_DEFINITIONS, *extra_fields)
    properties: dict[str, Any] = {}
    required: list[str] = []
    for definition in definitions:
        required.append(definition.name)
        if definition.name == "portions":
            properties[definition.name] = {
                "type": ["array", "null"],
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["name", "amount", "unit"],
                    "properties": {
                        "name": {"type": "string", "minLength": 1},
                        "amount": {"type": "number", "exclusiveMinimum": 0},
                        "unit": {"enum": ["g", "ml"]},
                    },
                },
            }
        elif definition.name in {"source_id", "source", "name"}:
            properties[definition.name] = {"type": "string", "minLength": 1}
        elif definition.name == "gtin":
            properties[definition.name] = {
                "type": ["string", "null"],
                "pattern": "^[0-9]{14}$",
            }
        elif definition.unit is None:
            properties[definition.name] = {"type": ["string", "null"]}
        else:
            properties[definition.name] = {"type": ["number", "null"], "minimum": 0}
        properties[definition.name]["description"] = definition.description
        properties[definition.name]["x-regolith-value-kind"] = definition.value_kind
        if definition.unit is not None:
            properties[definition.name]["x-regolith-unit"] = definition.unit

    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"urn:regolith:schema:raw-food:{SCHEMA_VERSION}",
        "title": f"Regolith normalized food schema {SCHEMA_VERSION}",
        "type": "object",
        "additionalProperties": False,
        "required": required,
        "properties": properties,
        "x-regolith-nutrient-basis": {
            "amount": NUTRIENT_BASIS_AMOUNT,
            "unit": NUTRIENT_BASIS_UNIT,
        },
    }


def raw_food_json_schema() -> dict[str, Any]:
    return json_schema()


def branded_food_json_schema() -> dict[str, Any]:
    schema = json_schema(BRANDED_FIELD_DEFINITIONS)
    schema["$id"] = f"urn:regolith:schema:branded-food:{SCHEMA_VERSION}"
    schema["title"] = f"Regolith normalized branded food schema {SCHEMA_VERSION}"
    return schema
