from typing import Any

from nutrition_ingest.common.contracts import FieldKind, FieldSpec
from nutrition_ingest.common.schema import CORE_FIELD_UNITS as CORE_FIELD_UNITS
from nutrition_ingest.common.schema import CORE_FOOD_FIELDS as CORE_FOOD_FIELDS

USDA_NUTRIENT_MAP = {
    "source_id": "fdcId",
    "source": "usda_fooddata_central",
    "name": "description",
    "portions": "foodPortions",
    "calories": {"fdc_id": 1008, "nutrient_nbr": "208", "name": "Energy"},
    "protein": {"fdc_id": 1003, "nutrient_nbr": "203", "name": "Protein"},
    "dietary_fat": {"fdc_id": 1004, "nutrient_nbr": "204", "name": "Total lipid (fat)"},
    "carbohydrates": {
        "fdc_id": 1005,
        "nutrient_nbr": "205",
        "name": "Carbohydrate, by difference",
    },
    "net_carbohydrates": {
        "fdc_id": "",
        "nutrient_nbr": "",
        "name": "computed: carbohydrate - fiber",
    },
    "fiber": {"fdc_id": 1079, "nutrient_nbr": "291", "name": "Fiber, total dietary"},
    "starch": {"fdc_id": 1009, "nutrient_nbr": "209", "name": "Starch"},
    "sugars": {
        "fdc_id": 2000,
        "nutrient_nbr": "269",
        "name": "Total Sugars",
        "fallback_fdc_ids": [1063],
    },
    "sugars_added": {"fdc_id": 1235, "nutrient_nbr": "539", "name": "Sugars, added"},
    "cysteine": {
        "fdc_id": 1232,
        "nutrient_nbr": "526",
        "name": "Cysteine",
        "fallback_fdc_ids": [1216],
    },
    "histidine": {"fdc_id": 1221, "nutrient_nbr": "512", "name": "Histidine"},
    "isoleucine": {"fdc_id": 1212, "nutrient_nbr": "503", "name": "Isoleucine"},
    "leucine": {"fdc_id": 1213, "nutrient_nbr": "504", "name": "Leucine"},
    "lysine": {"fdc_id": 1214, "nutrient_nbr": "505", "name": "Lysine"},
    "methionine": {"fdc_id": 1215, "nutrient_nbr": "506", "name": "Methionine"},
    "phenylalanine": {"fdc_id": 1217, "nutrient_nbr": "508", "name": "Phenylalanine"},
    "threonine": {"fdc_id": 1211, "nutrient_nbr": "502", "name": "Threonine"},
    "tryptophan": {"fdc_id": 1210, "nutrient_nbr": "501", "name": "Tryptophan"},
    "tyrosine": {"fdc_id": 1218, "nutrient_nbr": "509", "name": "Tyrosine"},
    "valine": {"fdc_id": 1219, "nutrient_nbr": "510", "name": "Valine"},
    "monounsaturated_fat": {
        "fdc_id": 1292,
        "nutrient_nbr": "645",
        "name": "Fatty acids, total monounsaturated",
    },
    "polyunsaturated_fat": {
        "fdc_id": 1293,
        "nutrient_nbr": "646",
        "name": "Fatty acids, total polyunsaturated",
    },
    "omega_3_fats": {
        "fdc_id": "",
        "nutrient_nbr": "",
        "name": "computed: sum of ALA, EPA, DHA",
        "fallback_fdc_ids": [1404, 1278, 1272],
        "fallback_mode": "sum",
    },
    "omega_3_ala": {
        "fdc_id": 1404,
        "nutrient_nbr": "851",
        "name": "PUFA 18:3 n-3 c,c,c (ALA)",
    },
    "omega_3_epa": {"fdc_id": 1278, "nutrient_nbr": "629", "name": "PUFA 20:5 n-3 (EPA)"},
    "omega_3_dha": {"fdc_id": 1272, "nutrient_nbr": "621", "name": "PUFA 22:6 n-3 (DHA)"},
    "omega_6_fats": {
        "fdc_id": 1316,
        "nutrient_nbr": "675",
        "name": "PUFA 18:2 n-6 c,c",
        "fallback_fdc_ids": [1293],
    },
    "saturated_fats": {
        "fdc_id": 1258,
        "nutrient_nbr": "606",
        "name": "Fatty acids, total saturated",
    },
    "trans_fats": {
        "fdc_id": 1257,
        "nutrient_nbr": "605",
        "name": "Fatty acids, total trans",
        "fallback_fdc_ids": [1329, 1330, 1331],
        "fallback_mode": "sum",
    },
    "vitamin_a_retinol": {"fdc_id": 1105, "nutrient_nbr": "319", "name": "Retinol"},
    "vitamin_b1_thiamin": {"fdc_id": 1165, "nutrient_nbr": "404", "name": "Thiamin"},
    "vitamin_b2_riboflavin": {"fdc_id": 1166, "nutrient_nbr": "405", "name": "Riboflavin"},
    "vitamin_b3_niacin": {"fdc_id": 1167, "nutrient_nbr": "406", "name": "Niacin"},
    "vitamin_b5_pantothenic_acid": {
        "fdc_id": 1170,
        "nutrient_nbr": "410",
        "name": "Pantothenic acid",
    },
    "vitamin_b6_pyridoxine": {
        "fdc_id": 1174,
        "nutrient_nbr": "414",
        "name": "Vitamin B-6, N411 + N412 +N413",
    },
    "vitamin_b12_cobalamin": {"fdc_id": 1178, "nutrient_nbr": "418", "name": "Vitamin B-12"},
    "folate_vitamin_b9": {"fdc_id": 1190, "nutrient_nbr": "435", "name": "Folate, DFE"},
    "vitamin_c_ascorbic_acid": {
        "fdc_id": 1162,
        "nutrient_nbr": "401",
        "name": "Vitamin C, total ascorbic acid",
    },
    "vitamin_d_calciferol": {
        "fdc_id": 1114,
        "nutrient_nbr": "328",
        "name": "Vitamin D (D2 + D3)",
    },
    "vitamin_e_tocopherol": {
        "fdc_id": 1109,
        "nutrient_nbr": "323",
        "name": "Vitamin E (alpha-tocopherol)",
    },
    "vitamin_k_phylloquinone_and_menaquinone": {
        "fdc_id": 1185,
        "nutrient_nbr": "430",
        "name": "Vitamin K (phylloquinone)",
    },
    "calcium": {"fdc_id": 1087, "nutrient_nbr": "301", "name": "Calcium, Ca"},
    "copper": {"fdc_id": 1098, "nutrient_nbr": "312", "name": "Copper, Cu"},
    "iron": {"fdc_id": 1089, "nutrient_nbr": "303", "name": "Iron, Fe"},
    "manganese": {"fdc_id": 1101, "nutrient_nbr": "315", "name": "Manganese, Mn"},
    "magnesium": {"fdc_id": 1090, "nutrient_nbr": "304", "name": "Magnesium, Mg"},
    "phosphorus": {"fdc_id": 1091, "nutrient_nbr": "305", "name": "Phosphorus, P"},
    "potassium": {"fdc_id": 1092, "nutrient_nbr": "306", "name": "Potassium, K"},
    "selenium": {"fdc_id": 1103, "nutrient_nbr": "317", "name": "Selenium, Se"},
    "sodium": {"fdc_id": 1093, "nutrient_nbr": "307", "name": "Sodium, Na"},
    "zinc": {"fdc_id": 1095, "nutrient_nbr": "309", "name": "Zinc, Zn"},
    "dietary_cholesterol": {"fdc_id": 1253, "nutrient_nbr": "601", "name": "Cholesterol"},
    "caffeine": {"fdc_id": 1057, "nutrient_nbr": "262", "name": "Caffeine"},
    "alcohol": {"fdc_id": 1018, "nutrient_nbr": "221", "name": "Alcohol, ethyl"},
    "water": {"fdc_id": 1051, "nutrient_nbr": "255", "name": "Water"},
    "choline": {"fdc_id": 1180, "nutrient_nbr": "421", "name": "Choline, total"},
}

COFID_NUTRIENT_MAP = {
    "source_id": "Food Code",
    "source": "cofid",
    "name": "Food Name",
    "portions": "",
    "calories": "Energy (kcal)",
    "protein": "Protein (g)",
    "dietary_fat": "Fat (g)",
    "carbohydrates": "Carbohydrate (g)",
    "net_carbohydrates": "Carbohydrate (g)",
    "fiber": "AOAC fibre (g)",
    "starch": "Starch (g)",
    "sugars": "Total sugars (g)",
    "sugars_added": "",
    "cysteine": "",
    "histidine": "",
    "isoleucine": "",
    "leucine": "",
    "lysine": "",
    "methionine": "",
    "phenylalanine": "",
    "threonine": "",
    "tryptophan": "",
    "tyrosine": "",
    "valine": "",
    "monounsaturated_fat": "Mono FA /100g food (g)",
    "polyunsaturated_fat": "Poly FA /100g food (g)",
    "omega_3_fats": "Total n-3 polyunsaturated fatty acids per 100g food",
    "omega_3_ala": "",
    "omega_3_epa": "",
    "omega_3_dha": "",
    "omega_6_fats": "Total n-6 polyunsaturated fatty acids per 100g food",
    "saturated_fats": "Saturated fatty acids per 100g food",
    "trans_fats": "Total Trans fatty acids per 100g food",
    "vitamin_a_retinol": "Retinol (µg)",
    "vitamin_b1_thiamin": "Thiamin (mg)",
    "vitamin_b2_riboflavin": "Riboflavin (mg)",
    "vitamin_b3_niacin": "Niacin (mg)",
    "vitamin_b5_pantothenic_acid": "",
    "vitamin_b6_pyridoxine": "Vitamin B6 (mg)",
    "vitamin_b12_cobalamin": "Vitamin B12 (µg)",
    "folate_vitamin_b9": "Folate (µg)",
    "vitamin_c_ascorbic_acid": "Vitamin C (mg)",
    "vitamin_d_calciferol": "Vitamin D (µg)",
    "vitamin_e_tocopherol": "Vitamin E (mg)",
    "vitamin_k_phylloquinone_and_menaquinone": "Vitamin K1 (µg)",
    "calcium": "Calcium (mg)",
    "copper": "Copper (mg)",
    "iron": "Iron (mg)",
    "manganese": "Manganese (mg)",
    "magnesium": "Magnesium (mg)",
    "phosphorus": "Phosphorus (mg)",
    "potassium": "Potassium (mg)",
    "selenium": "Selenium (µg)",
    "sodium": "Sodium (mg)",
    "zinc": "Zinc (mg)",
    "dietary_cholesterol": "Cholesterol (mg)",
    "caffeine": "",
    "alcohol": "Alcohol (g)",
    "water": "Water (g)",
    "choline": "",
}

NEW_ZEALAND_NUTRIENT_MAP = {
    "source_id": "FoodID",
    "source": "new_zealand_food_composition",
    "name": "Short Food Name",
    "portions": "",
    "calories": "Energy",
    "protein": "Protein",
    "dietary_fat": "Fat",
    "carbohydrates": "Carbohydrate, available",
    "net_carbohydrates": "Carbohydrate, available",
    "fiber": "Dietary fibre",
    "starch": "Starch",
    "sugars": "Sugars",
    "sugars_added": "",
    "cysteine": "",
    "histidine": "",
    "isoleucine": "",
    "leucine": "",
    "lysine": "",
    "methionine": "",
    "phenylalanine": "",
    "threonine": "",
    "tryptophan": "",
    "tyrosine": "",
    "valine": "",
    "monounsaturated_fat": "MUFA",
    "polyunsaturated_fat": "PUFA",
    "omega_3_fats": "",
    "omega_3_ala": "Alpha-linolenic acid",
    "omega_3_epa": "",
    "omega_3_dha": "",
    "omega_6_fats": "Linoleic acid",
    "saturated_fats": "SFA",
    "trans_fats": "",
    "vitamin_a_retinol": "Vitamin A",
    "vitamin_b1_thiamin": "Thiamin",
    "vitamin_b2_riboflavin": "Riboflavin",
    "vitamin_b3_niacin": "Niacin",
    "vitamin_b5_pantothenic_acid": "",
    "vitamin_b6_pyridoxine": "Vitamin B6",
    "vitamin_b12_cobalamin": "Vitamin B12",
    "folate_vitamin_b9": "Dietary folate",
    "vitamin_c_ascorbic_acid": "Vitamin C",
    "vitamin_d_calciferol": "Vitamin D",
    "vitamin_e_tocopherol": "Vitamin E",
    "vitamin_k_phylloquinone_and_menaquinone": "",
    "calcium": "Calcium Ca",
    "copper": "",
    "iron": "Iron Fe",
    "manganese": "",
    "magnesium": "",
    "phosphorus": "Phosphorus P",
    "potassium": "Potassium K",
    "selenium": "Selenium Se",
    "sodium": "Sodium Na",
    "zinc": "Zinc Zn",
    "dietary_cholesterol": "Cholesterol",
    "caffeine": "",
    "alcohol": "",
    "water": "Water",
    "choline": "",
}

AUSTRALIA_NUTRIENT_MAP = {
    "source_id": "Public Food Key",
    "source": "australian_food_composition",
    "name": "Food Name",
    "portions": "",
    "calories": "Energy with dietary fibre, equated (kJ)",
    "protein": "Protein (g)",
    "dietary_fat": "Fat, total (g)",
    "carbohydrates": "Available carbohydrate, with sugar alcohols (g)",
    "net_carbohydrates": "Available carbohydrate, without sugar alcohols (g)",
    "fiber": "Total dietary fibre (g)",
    "starch": "Starch (g)",
    "sugars": "Total sugars (g)",
    "sugars_added": "Added sugars (g)",
    "cysteine": "Cystine plus cysteine (mg)",
    "histidine": "Histidine (mg)",
    "isoleucine": "Isoleucine (mg)",
    "leucine": "Leucine (mg)",
    "lysine": "Lysine (mg)",
    "methionine": "Methionine (mg)",
    "phenylalanine": "Phenylalanine (mg)",
    "threonine": "Threonine (mg)",
    "tryptophan": "Tryptophan (mg)",
    "tyrosine": "Tyrosine (mg)",
    "valine": "Valine (mg)",
    "monounsaturated_fat": "Total monounsaturated fatty acids, equated (g)",
    "polyunsaturated_fat": "Total polyunsaturated fatty acids, equated (g)",
    "omega_3_fats": "Total long chain omega 3 fatty acids, equated (mg)",
    "omega_3_ala": "C18:3w3 (g)",
    "omega_3_epa": "C20:5w3 (mg)",
    "omega_3_dha": "C22:6w3 (mg)",
    "omega_6_fats": "C18:2w6 (g)",
    "saturated_fats": "Total saturated fatty acids, equated (g)",
    "trans_fats": "Total trans fatty acids, imputed (mg)",
    "vitamin_a_retinol": "Retinol (preformed vitamin A) (ug)",
    "vitamin_b1_thiamin": "Thiamin (B1) (mg)",
    "vitamin_b2_riboflavin": "Riboflavin (B2) (mg)",
    "vitamin_b3_niacin": "Niacin (B3) (mg)",
    "vitamin_b5_pantothenic_acid": "Pantothenic acid (B5) (mg)",
    "vitamin_b6_pyridoxine": "Pyridoxine (B6) (mg)",
    "vitamin_b12_cobalamin": "Cobalamin (B12) (ug)",
    "folate_vitamin_b9": "Total folates (ug)",
    "vitamin_c_ascorbic_acid": "Vitamin C (mg)",
    "vitamin_d_calciferol": "Vitamin D3 equivalents (ug)",
    "vitamin_e_tocopherol": "Vitamin E (mg)",
    "vitamin_k_phylloquinone_and_menaquinone": "",
    "calcium": "Calcium (Ca) (mg)",
    "copper": "Copper (Cu) (mg)",
    "iron": "Iron (Fe) (mg)",
    "manganese": "Manganese (Mn) (mg)",
    "magnesium": "Magnesium (Mg) (mg)",
    "phosphorus": "Phosphorus (P) (mg)",
    "potassium": "Potassium (K) (mg)",
    "selenium": "Selenium (Se) (ug)",
    "sodium": "Sodium (Na) (mg)",
    "zinc": "Zinc (Zn) (mg)",
    "dietary_cholesterol": "Cholesterol (mg)",
    "caffeine": "Caffeine (mg)",
    "alcohol": "Alcohol (g)",
    "water": "Moisture (water) (g)",
    "choline": "",
}

NEVO_NUTRIENT_MAP = {
    "source_id": "NEVO-code",
    "source": "nevo2025",
    "name": "Engelse naam/Food name",
    "portions": "",
    "calories": "ENERCC",
    "protein": "PROT",
    "dietary_fat": "FAT",
    "carbohydrates": "CHO",
    "net_carbohydrates": "CHO",
    "fiber": "FIBT",
    "starch": "STARCH",
    "sugars": "SUGAR",
    "sugars_added": "",
    "cysteine": "",
    "histidine": "",
    "isoleucine": "",
    "leucine": "",
    "lysine": "",
    "methionine": "",
    "phenylalanine": "",
    "threonine": "",
    "tryptophan": "TRP",
    "tyrosine": "",
    "valine": "",
    "monounsaturated_fat": "FAMSCIS",
    "polyunsaturated_fat": "FAPU",
    "omega_3_fats": "FAPUN3",
    "omega_3_ala": "F18:3CN3",
    "omega_3_epa": "F20:5CN3",
    "omega_3_dha": "F22:6CN3",
    "omega_6_fats": "FAPUN6",
    "saturated_fats": "FASAT",
    "trans_fats": "FATRS",
    "vitamin_a_retinol": "RETOL",
    "vitamin_b1_thiamin": "THIA",
    "vitamin_b2_riboflavin": "RIBF",
    "vitamin_b3_niacin": "NIA",
    "vitamin_b5_pantothenic_acid": "",
    "vitamin_b6_pyridoxine": "VITB6",
    "vitamin_b12_cobalamin": "VITB12",
    "folate_vitamin_b9": "FOL",
    "vitamin_c_ascorbic_acid": "VITC",
    "vitamin_d_calciferol": "VITD",
    "vitamin_e_tocopherol": "VITE",
    "vitamin_k_phylloquinone_and_menaquinone": "VITK",
    "calcium": "CA",
    "copper": "CU",
    "iron": "FE",
    "manganese": "",
    "magnesium": "MG",
    "phosphorus": "P",
    "potassium": "K",
    "selenium": "SE",
    "sodium": "NA",
    "zinc": "ZN",
    "dietary_cholesterol": "CHORL",
    "caffeine": "",
    "alcohol": "ALC",
    "water": "WATER",
    "choline": "",
}

CNF_NUTRIENT_MAP = {
    "source_id": "FoodID",
    "source": "canadian_nutrient_file",
    "name": "FoodDescription",
    "portions": "",
    "calories": "KCAL",
    "protein": "PROT",
    "dietary_fat": "FAT",
    "carbohydrates": "CARB",
    "net_carbohydrates": "CARB",
    "fiber": "TDF",
    "starch": "STAR",
    "sugars": "TSUG",
    "sugars_added": "",
    "cysteine": "CYS",
    "histidine": "HIS",
    "isoleucine": "ISO",
    "leucine": "LEU",
    "lysine": "LYS",
    "methionine": "MET",
    "phenylalanine": "PHE",
    "threonine": "THR",
    "tryptophan": "TRP",
    "tyrosine": "TYR",
    "valine": "VAL",
    "monounsaturated_fat": "MUFA",
    "polyunsaturated_fat": "PUFA",
    "omega_3_fats": "TOmega n-3",
    "omega_3_ala": "18:3cccn-3",
    "omega_3_epa": "20:5n-3EPA",
    "omega_3_dha": "22:6n-3DHA",
    "omega_6_fats": "TOmega n-6",
    "saturated_fats": "TSAT",
    "trans_fats": "TRFA",
    "vitamin_a_retinol": "RT-µG",
    "vitamin_b1_thiamin": "THIA",
    "vitamin_b2_riboflavin": "RIBO",
    "vitamin_b3_niacin": "N-MG",
    "vitamin_b5_pantothenic_acid": "PANT",
    "vitamin_b6_pyridoxine": "B6",
    "vitamin_b12_cobalamin": "B12",
    "folate_vitamin_b9": "DFE",
    "vitamin_c_ascorbic_acid": "VITC",
    "vitamin_d_calciferol": "D3+D2-µG",
    "vitamin_e_tocopherol": "ATMG",
    "vitamin_k_phylloquinone_and_menaquinone": "VITK",
    "calcium": "CA",
    "copper": "CU",
    "iron": "FE",
    "manganese": "MN",
    "magnesium": "MG",
    "phosphorus": "P",
    "potassium": "K",
    "selenium": "SE",
    "sodium": "NA",
    "zinc": "ZN",
    "dietary_cholesterol": "CHOL",
    "caffeine": "CAFF",
    "alcohol": "ALCO",
    "water": "H2O",
    "choline": "CHOLN",
}


_COMMON_V2_RENAMES = {
    "dietary_fat": "total_fat",
    "sugars": "total_sugars",
    "sugars_added": "added_sugars",
    "saturated_fats": "saturated_fat",
    "trans_fats": "trans_fat",
    "vitamin_b6_pyridoxine": "vitamin_b6",
    "vitamin_k_phylloquinone_and_menaquinone": "vitamin_k_phylloquinone",
}


def _base_v2_map(raw_map: dict[str, Any]) -> dict[str, Any]:
    converted: dict[str, Any] = {field: "" for field in CORE_FOOD_FIELDS}
    for old_field, value in raw_map.items():
        target = _COMMON_V2_RENAMES.get(old_field, old_field)
        if target in converted and old_field not in {
            "carbohydrates",
            "net_carbohydrates",
            "omega_3_fats",
            "omega_6_fats",
            "folate_vitamin_b9",
        }:
            converted[target] = value
    return converted


def _v2_column_map(
    raw_map: dict[str, str],
    *,
    carbohydrate_kind: str,
    folate_kind: str,
    reported_omega_3: bool,
    reported_omega_6: bool,
    linoleic_from_omega_6: bool = False,
    phylloquinone: bool = False,
) -> dict[str, str]:
    converted = _base_v2_map(raw_map)

    if carbohydrate_kind == "total":
        converted["carbohydrates_total"] = raw_map.get("carbohydrates", "")
    elif carbohydrate_kind == "available":
        converted["carbohydrates_available"] = raw_map.get("carbohydrates", "")
    elif carbohydrate_kind == "australia_available_without_polyols":
        converted["carbohydrates_available"] = raw_map.get("net_carbohydrates", "")
    else:
        raise ValueError(f"Unsupported carbohydrate mapping kind: {carbohydrate_kind}")

    if folate_kind == "dfe":
        converted["folate_dfe"] = raw_map.get("folate_vitamin_b9", "")
    elif folate_kind == "total":
        converted["folate_total"] = raw_map.get("folate_vitamin_b9", "")
    else:
        raise ValueError(f"Unsupported folate mapping kind: {folate_kind}")

    if reported_omega_3:
        converted["omega_3_total_reported"] = raw_map.get("omega_3_fats", "")
    if reported_omega_6:
        converted["omega_6_total_reported"] = raw_map.get("omega_6_fats", "")
    if linoleic_from_omega_6:
        converted["omega_6_linoleic_acid"] = raw_map.get("omega_6_fats", "")
    if not phylloquinone:
        converted["vitamin_k_phylloquinone"] = ""
    return converted


def _v2_usda_map(raw_map: dict[str, Any]) -> dict[str, Any]:
    converted = _base_v2_map(raw_map)
    converted["calories"] = {
        **raw_map["calories"],
        "fallback_fdc_ids": [2048, 2047],
    }
    converted["carbohydrates_total"] = raw_map["carbohydrates"]
    converted["carbohydrates_net_calculated"] = {
        "fdc_id": "",
        "name": "computed: carbohydrates_total - fiber",
    }
    converted["omega_3_total_reported"] = ""
    converted["omega_3_ala_epa_dha_sum"] = {
        "fdc_id": "",
        "name": "computed: ALA + EPA + DHA when all components are present",
    }
    converted["omega_6_total_reported"] = ""
    converted["omega_6_linoleic_acid"] = {
        "fdc_id": 1316,
        "nutrient_nbr": "675",
        "name": "PUFA 18:2 n-6 c,c",
    }
    converted["vitamin_b6"] = {
        "fdc_id": 1175,
        "nutrient_nbr": "415",
        "name": "Vitamin B-6",
    }
    converted["folate_total"] = ""
    converted["folate_dfe"] = raw_map["folate_vitamin_b9"]
    converted["vitamin_k_phylloquinone"] = raw_map["vitamin_k_phylloquinone_and_menaquinone"]
    return converted


USDA_NUTRIENT_MAP = _v2_usda_map(USDA_NUTRIENT_MAP)
COFID_NUTRIENT_MAP = _v2_column_map(
    COFID_NUTRIENT_MAP,
    carbohydrate_kind="available",
    folate_kind="total",
    reported_omega_3=True,
    reported_omega_6=True,
    phylloquinone=True,
)
NEW_ZEALAND_NUTRIENT_MAP = _v2_column_map(
    NEW_ZEALAND_NUTRIENT_MAP,
    carbohydrate_kind="available",
    folate_kind="total",
    reported_omega_3=False,
    reported_omega_6=False,
    linoleic_from_omega_6=True,
)
AUSTRALIA_NUTRIENT_MAP = _v2_column_map(
    AUSTRALIA_NUTRIENT_MAP,
    carbohydrate_kind="australia_available_without_polyols",
    folate_kind="total",
    reported_omega_3=False,
    reported_omega_6=False,
    linoleic_from_omega_6=True,
)
NEVO_NUTRIENT_MAP = _v2_column_map(
    NEVO_NUTRIENT_MAP,
    carbohydrate_kind="total",
    folate_kind="total",
    reported_omega_3=True,
    reported_omega_6=True,
)
CNF_NUTRIENT_MAP = _v2_column_map(
    CNF_NUTRIENT_MAP,
    carbohydrate_kind="total",
    folate_kind="dfe",
    reported_omega_3=True,
    reported_omega_6=True,
)


def _normalize_fallback_sources(value: Any) -> tuple[str | int, ...]:
    if not isinstance(value, list):
        return ()
    normalized: list[str | int] = []
    for entry in value:
        if isinstance(entry, (str, int)):
            normalized.append(entry)
    return tuple(normalized)


def build_field_specs_from_column_map(raw_map: dict[str, str]) -> dict[str, FieldSpec]:
    specs: dict[str, FieldSpec] = {}
    for target_field in CORE_FOOD_FIELDS:
        raw_source = raw_map.get(target_field, "")
        if target_field == "source":
            if raw_source:
                specs[target_field] = FieldSpec(kind=FieldKind.LITERAL, source=raw_source)
            else:
                specs[target_field] = FieldSpec(kind=FieldKind.MISSING)
            continue

        if raw_source == "":
            specs[target_field] = FieldSpec(kind=FieldKind.MISSING)
            continue

        specs[target_field] = FieldSpec(kind=FieldKind.SOURCE, source=raw_source)
    return specs


def build_field_specs_from_usda_map(raw_map: dict[str, Any]) -> dict[str, FieldSpec]:
    specs: dict[str, FieldSpec] = {}
    for target_field in CORE_FOOD_FIELDS:
        raw_value = raw_map.get(target_field, "")

        if target_field == "source":
            if isinstance(raw_value, str) and raw_value:
                specs[target_field] = FieldSpec(kind=FieldKind.LITERAL, source=raw_value)
            else:
                specs[target_field] = FieldSpec(kind=FieldKind.MISSING)
            continue

        if target_field in {"source_id", "name", "portions"}:
            if isinstance(raw_value, str) and raw_value:
                specs[target_field] = FieldSpec(kind=FieldKind.SOURCE, source=raw_value)
            else:
                specs[target_field] = FieldSpec(kind=FieldKind.MISSING)
            continue

        if not isinstance(raw_value, dict):
            specs[target_field] = FieldSpec(kind=FieldKind.MISSING)
            continue

        source = raw_value.get("fdc_id")
        fallback_sources = _normalize_fallback_sources(raw_value.get("fallback_fdc_ids"))
        fallback_mode = (
            raw_value.get("fallback_mode", "first")
            if isinstance(raw_value.get("fallback_mode", "first"), str)
            else "first"
        )

        if source in ("", None) and not fallback_sources:
            computed_name = raw_value.get("name")
            if isinstance(computed_name, str) and computed_name.casefold().startswith("computed:"):
                specs[target_field] = FieldSpec(kind=FieldKind.COMPUTED, metadata=raw_value)
            else:
                specs[target_field] = FieldSpec(kind=FieldKind.MISSING, metadata=raw_value)
            continue

        specs[target_field] = FieldSpec(
            kind=FieldKind.NUTRIENT_ID,
            source=source,
            fallback_sources=fallback_sources,
            fallback_mode=fallback_mode,
            metadata=raw_value,
        )
    return specs


USDA_FIELD_SPECS = build_field_specs_from_usda_map(USDA_NUTRIENT_MAP)
COFID_FIELD_SPECS = build_field_specs_from_column_map(COFID_NUTRIENT_MAP)
NEW_ZEALAND_FIELD_SPECS = build_field_specs_from_column_map(NEW_ZEALAND_NUTRIENT_MAP)
AUSTRALIA_FIELD_SPECS = build_field_specs_from_column_map(AUSTRALIA_NUTRIENT_MAP)
NEVO_FIELD_SPECS = build_field_specs_from_column_map(NEVO_NUTRIENT_MAP)
CNF_FIELD_SPECS = build_field_specs_from_column_map(CNF_NUTRIENT_MAP)
