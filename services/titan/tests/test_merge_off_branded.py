import unittest
from pathlib import Path
from typing import cast

from titan.nutrient_mapping import CORE_FOOD_FIELDS
from titan.parsers import merge_off_branded


class MergeOffBrandedTests(unittest.TestCase):
    def test_validate_branded_output_path_blocks_raw_filename(self):
        with self.assertRaisesRegex(RuntimeError, "Refusing to write branded rows"):
            merge_off_branded.validate_branded_output_path(Path("data/outputs/raw-foods.jsonl"))

    def test_validate_branded_output_path_accepts_branded_filename(self):
        merge_off_branded.validate_branded_output_path(Path("data/outputs/branded-foods.jsonl"))

    def test_gtin_is_validated_and_padded(self):
        self.assertEqual(
            merge_off_branded.normalize_gtin("012345678905"),
            "00012345678905",
        )
        self.assertIsNone(merge_off_branded.normalize_gtin("9345678901234"))

    def test_merge_rows_prefers_usda_upc(self):
        usda_rows = [{"source": "usda", "gtin": "012345678905", "name": "USDA"}]
        off_rows = [
            {"source": "off", "gtin": "0012345678905", "name": "OFF duplicate"},
            {"source": "off", "gtin": "123456789012", "name": "OFF unique"},
        ]

        merged = list(merge_off_branded.merge_rows_with_usda_priority(usda_rows, off_rows))
        self.assertEqual(len(merged), 2)
        self.assertEqual(merged[0]["source"], "usda")
        self.assertEqual(merged[1]["source"], "off")
        self.assertEqual(merged[1]["name"], "OFF unique")

    def test_enforce_unique_upc(self):
        rows = [
            {"source": "a", "gtin": "012345678905", "name": "name-a"},
            {"source": "b", "gtin": "0012345678905", "name": "name-b"},
            {"source": "c", "gtin": "123456789012", "name": "name-c"},
        ]

        deduped = list(merge_off_branded.enforce_unique_keys(rows, unique_upc=True))
        self.assertEqual(len(deduped), 2)
        self.assertEqual(deduped[0]["name"], "name-a")
        self.assertEqual(deduped[1]["name"], "name-c")

    def test_name_is_not_used_for_dedup(self):
        rows = [
            {"source": "a", "gtin": "012345678905", "name": "Same Name"},
            {"source": "b", "gtin": None, "name": " same   name "},
            {"source": "c", "gtin": "123456789012", "name": "Other Name"},
        ]

        deduped = list(merge_off_branded.enforce_unique_keys(rows))
        self.assertEqual(len(deduped), 3)

    def test_convert_iu_for_vitamin_d(self):
        converted = merge_off_branded.convert_nutrient_value(
            100.0,
            "iu",
            "mcg",
            "vitamin_d_calciferol",
        )
        self.assertIsNotNone(converted)
        self.assertAlmostEqual(cast(float, converted), 2.5, places=6)

    def test_extract_usda_brand_prefers_brand_name(self):
        food_row = {
            "brandOwner": "Owner Corp",
            "subbrandName": "Subbrand",
            "brandName": "Primary Brand",
        }
        self.assertEqual(merge_off_branded.extract_usda_brand(food_row), "Primary Brand")

    def test_extract_off_brand_from_tags(self):
        food_row = {"brands_tags": ["en:sample-brand"]}
        self.assertEqual(merge_off_branded.extract_off_brand(food_row), "sample-brand")

    def test_extract_off_brand_discards_postgres_incompatible_nul(self):
        self.assertIsNone(merge_off_branded.extract_off_brand({"brands": "bad\x00brand"}))

    def test_map_off_row_converts_units_and_computes_net_carbs(self):
        off_row = {
            "code": "0012345678905",
            "lang": "en",
            "product_name": [{"lang": "en", "text": "Sample Product"}],
            "brands": "Sample Brand, Parent Brand",
            "serving_size": "2 Tbsp (30 g)",
            "serving_quantity": "2",
            "nutriments": [
                {"name": "energy-kcal", "100g": 120.0, "unit": "kcal"},
                {"name": "proteins", "100g": 4.0, "unit": "g"},
                {"name": "carbohydrates", "100g": 20.0, "unit": "g"},
                {"name": "fiber", "100g": 5.0, "unit": "g"},
                {"name": "sodium", "100g": 0.4, "unit": "g"},
                {"name": "vitamin-c", "100g": 60.0, "unit": "mg"},
            ],
        }

        target_units: dict[str, str | None] = {field: None for field in CORE_FOOD_FIELDS}
        target_units.update(
            {
                "calories": "kcal",
                "protein": "g",
                "carbohydrates_total": "g",
                "fiber": "g",
                "sodium": "mg",
                "vitamin_c_ascorbic_acid": "mg",
            }
        )

        mapped = merge_off_branded.map_off_row(off_row, target_units, CORE_FOOD_FIELDS)
        self.assertEqual(set(mapped.keys()), set(CORE_FOOD_FIELDS + ["gtin", "brand"]))
        self.assertEqual(mapped["source"], "open_food_facts")
        self.assertEqual(mapped["name"], "Sample Product")
        self.assertEqual(mapped["brand"], "Sample Brand")
        self.assertAlmostEqual(mapped["sodium"], 400.0, places=5)
        self.assertAlmostEqual(mapped["carbohydrates_net_calculated"], 15.0, places=5)
        self.assertIsInstance(mapped["portions"], list)
        self.assertEqual(mapped["portions"][0]["unit"], "g")
        self.assertAlmostEqual(mapped["portions"][0]["amount"], 30.0, places=5)

    def test_enforce_display_safety_skips_rows_without_names(self):
        rows = [
            {"source_id": "1", "name": " ", "calories": 150.0},
            {"source_id": "2", "name": None, "calories": 200.0},
            {"source_id": "3", "name": "Valid Name", "calories": 100.0},
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["source_id"], "3")

    def test_enforce_display_safety_nulls_outliers(self):
        rows = [
            {
                "source_id": "1",
                "name": "Valid Name",
                "calories": 1000.0,
                "carbohydrates_total": 20.0,
                "sodium": float("inf"),
            }
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["calories"], 1000.0)
        self.assertIsNone(filtered[0]["sodium"])

    def test_enforce_display_safety_recomputes_derived_fields(self):
        rows = [
            {
                "source_id": "1",
                "name": "Invalid source fibre",
                "carbohydrates_total": 17.0,
                "fiber": -1.0,
                "carbohydrates_net_calculated": 18.0,
                "omega_3_ala": 1.0,
                "omega_3_epa": -1.0,
                "omega_3_dha": 1.0,
                "omega_3_ala_epa_dha_sum": 1.0,
            }
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertIsNone(filtered[0]["fiber"])
        self.assertIsNone(filtered[0]["carbohydrates_net_calculated"])
        self.assertIsNone(filtered[0]["omega_3_epa"])
        self.assertIsNone(filtered[0]["omega_3_ala_epa_dha_sum"])

    def test_enforce_display_safety_drops_rows_with_two_bad_macros(self):
        rows = [
            {
                "source_id": "1",
                "name": "Valid Name",
                "calories": -1.0,
                "carbohydrates_total": -1.0,
            }
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(filtered, [])


if __name__ == "__main__":
    unittest.main()
