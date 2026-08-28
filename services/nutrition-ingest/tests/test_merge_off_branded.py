import unittest
from typing import cast

from nutrition_ingest.nutrient_mapping import CORE_FOOD_FIELDS
from nutrition_ingest.parsers import merge_off_branded


class MergeOffBrandedTests(unittest.TestCase):
    @staticmethod
    def valid_display_row(**overrides):
        row = {
            "source_id": "food-1",
            "source": "open_food_facts",
            "name": "Valid Food",
            "gtin": "00012345678905",
            "brand": "Example",
            "calories": 100.0,
            "protein": 5.0,
            "total_fat": 2.0,
            "carbohydrates_total": 15.0,
        }
        row.update(overrides)
        return row

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
            self.valid_display_row(source_id="1", name=" "),
            self.valid_display_row(source_id="2", name=None),
            self.valid_display_row(source_id="3", name="Valid Name"),
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["source_id"], "3")

    def test_enforce_display_safety_nulls_outliers(self):
        rows = [
            self.valid_display_row(
                source_id="1",
                calories=1000.0,
                carbohydrates_total=20.0,
                sodium=float("inf"),
            )
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["calories"], 1000.0)
        self.assertIsNone(filtered[0]["sodium"])

    def test_enforce_display_safety_recomputes_derived_fields(self):
        rows = [
            self.valid_display_row(
                source_id="1",
                name="Invalid source fibre",
                carbohydrates_total=17.0,
                **{
                    "fiber": -1.0,
                    "carbohydrates_net_calculated": 18.0,
                    "omega_3_ala": 1.0,
                    "omega_3_epa": -1.0,
                    "omega_3_dha": 1.0,
                    "omega_3_ala_epa_dha_sum": 1.0,
                },
            )
        ]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(len(filtered), 1)
        self.assertIsNone(filtered[0]["fiber"])
        self.assertIsNone(filtered[0]["carbohydrates_net_calculated"])
        self.assertIsNone(filtered[0]["omega_3_epa"])
        self.assertIsNone(filtered[0]["omega_3_ala_epa_dha_sum"])

    def test_enforce_display_safety_drops_rows_with_two_bad_macros(self):
        rows = [self.valid_display_row(calories=-1.0, carbohydrates_total=-1.0)]

        filtered = list(merge_off_branded.enforce_display_safety(rows))
        self.assertEqual(filtered, [])

    def test_enforce_display_safety_requires_complete_core_nutrition(self):
        rows = [
            self.valid_display_row(protein=None),
            self.valid_display_row(total_fat=None),
            self.valid_display_row(carbohydrates_total=None),
            self.valid_display_row(calories=None),
        ]

        self.assertEqual(list(merge_off_branded.enforce_display_safety(rows)), [])

    def test_enforce_display_safety_requires_a_valid_gtin(self):
        rows = [
            self.valid_display_row(gtin=None),
            self.valid_display_row(gtin="123"),
        ]

        self.assertEqual(list(merge_off_branded.enforce_display_safety(rows)), [])

    def test_enforce_display_safety_rejects_impossible_nutrition(self):
        rows = [
            self.valid_display_row(calories=1001.0),
            self.valid_display_row(protein=101.0),
            self.valid_display_row(protein=50.0, total_fat=50.0, carbohydrates_total=50.0),
            self.valid_display_row(calories=0.0, protein=1.0),
        ]

        self.assertEqual(list(merge_off_branded.enforce_display_safety(rows)), [])

    def test_enforce_display_safety_normalizes_identity_whitespace(self):
        row = self.valid_display_row(
            name="  Valid\n  Food ",
            brand="  Example   Brand ",
        )

        filtered = list(merge_off_branded.enforce_display_safety([row]))

        self.assertEqual(filtered[0]["name"], "Valid Food")
        self.assertEqual(filtered[0]["brand"], "Example Brand")

    def test_enforce_display_safety_normalizes_all_caps_food_names(self):
        row = self.valid_display_row(
            name="CORNFLAKE CRUMBS WITH BBQ SEASONING",
        )

        filtered = list(merge_off_branded.enforce_display_safety([row]))

        self.assertEqual(
            filtered[0]["name"],
            "Cornflake Crumbs with BBQ Seasoning",
        )

    def test_display_name_preserves_mixed_case_and_non_latin_names(self):
        self.assertEqual(
            merge_off_branded.normalize_display_name("Jason's Corn Flakes"),
            "Jason's Corn Flakes",
        )
        self.assertEqual(merge_off_branded.normalize_display_name("𰻞𰻞麺"), "𰻞𰻞麺")

    def test_off_nutrient_values_must_be_reported_per_100g(self):
        self.assertEqual(
            merge_off_branded.extract_off_nutriment_value(
                {"100g": 12.0, "value": 24.0, "serving": 6.0, "unit": "g"}
            ),
            (12.0, "g"),
        )
        self.assertEqual(
            merge_off_branded.extract_off_nutriment_value(
                {"value": 24.0, "serving": 6.0, "unit": "g"}
            ),
            (None, None),
        )

    def test_off_quality_flags_exclude_unusable_products(self):
        self.assertTrue(merge_off_branded.has_acceptable_off_source_quality({}))
        self.assertTrue(
            merge_off_branded.has_acceptable_off_source_quality({"data_quality_errors_tags": []})
        )
        self.assertFalse(
            merge_off_branded.has_acceptable_off_source_quality(
                {"data_quality_errors_tags": ["en:nutrition-value-very-high"]}
            )
        )
        self.assertFalse(
            merge_off_branded.has_acceptable_off_source_quality({"no_nutrition_data": True})
        )
        self.assertFalse(merge_off_branded.has_acceptable_off_source_quality({"obsolete": True}))


if __name__ == "__main__":
    unittest.main()
