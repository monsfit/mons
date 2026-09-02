import unittest
from pathlib import Path
from unittest.mock import patch

from nutrition_ingest.parsers import normalize_raw


class NormalizeRawTests(unittest.TestCase):
    def test_enforce_defined_names_filters_null_and_blank_names(self):
        rows = [
            {"source_id": "1", "name": "Apple"},
            {"source_id": "2", "name": "   "},
            {"source_id": "3", "name": None},
            {"source_id": "4", "name": 123},
        ]

        filtered = list(normalize_raw.enforce_defined_names(rows))
        self.assertEqual(filtered, [{"source_id": "1", "name": "Apple"}])

    def test_iter_rows_enforces_defined_names_for_all_sources(self):
        paths = {
            "australia_workbook": Path("australia.xlsx"),
            "canada_directory": Path("canada"),
            "cofid_workbook": Path("cofid.xlsx"),
            "nevo_workbook": Path("nevo.xlsx"),
            "new_zealand_workbook": Path("new_zealand.xlsx"),
            "survey_json": Path("survey.json"),
            "foundation_json": Path("foundation.json"),
            "sr_legacy_json": Path("sr_legacy.json"),
            "nutrient_csv": Path("nutrient.csv"),
        }

        with (
            patch.object(
                normalize_raw.australia_parser,
                "iter_rows",
                return_value=iter(
                    [
                        {"name": "Australia Food", "source": "australia"},
                        {"name": None, "source": "australia"},
                    ]
                ),
            ),
            patch.object(
                normalize_raw.canada_parser,
                "iter_rows",
                return_value=iter(
                    [
                        {"name": "Canada Food", "source": "canada"},
                        {"name": "   ", "source": "canada"},
                    ]
                ),
            ),
            patch.object(
                normalize_raw.cofid_parser,
                "iter_rows",
                return_value=iter(
                    [
                        {"name": "CoFID Food", "source": "cofid"},
                        {"name": 42, "source": "cofid"},
                    ]
                ),
            ),
            patch.object(
                normalize_raw.nevo_parser,
                "iter_rows",
                return_value=iter(
                    [
                        {"name": "NEVO Food", "source": "nevo"},
                        {"name": "", "source": "nevo"},
                    ]
                ),
            ),
            patch.object(
                normalize_raw.new_zealand_parser,
                "iter_rows",
                return_value=iter(
                    [
                        {"name": "New Zealand Food", "source": "new_zealand"},
                        {"name": None, "source": "new_zealand"},
                    ]
                ),
            ),
            patch.object(normalize_raw.usda_parser, "build_usda_runtime_map", return_value={}),
            patch.object(normalize_raw.usda_parser, "load_nutrient_rows", return_value={}),
            patch.object(normalize_raw.usda_parser, "validate_mapping_fields"),
            patch.object(normalize_raw.usda_parser, "validate_mapping_nutrients"),
            patch.object(normalize_raw.usda_parser, "validate_core_field_units_against_usda"),
            patch.object(
                normalize_raw.usda_parser,
                "iter_all_usda_rows",
                return_value=iter(
                    [
                        {"name": "USDA Food", "source": "usda"},
                        {"name": "\t", "source": "usda"},
                    ]
                ),
            ),
        ):
            rows = list(normalize_raw.iter_rows(paths))

        self.assertEqual(
            [row["name"] for row in rows],
            [
                "Australia Food",
                "Canada Food",
                "CoFID Food",
                "NEVO Food",
                "New Zealand Food",
                "USDA Food",
            ],
        )

    def test_enforce_unique_names_prefers_usda_source(self):
        rows = [
            {
                "name": "Apple, raw",
                "source": "cofid",
                "calories": 52.0,
                "protein": 1.0,
                "fiber": 2.4,
            },
            {
                "name": " apple,   RAW ",
                "source": "usda_fooddata_central_survey",
                "calories": 52.0,
            },
            {"name": "Banana, raw", "source": "cofid", "calories": 89.0},
        ]
        deduped = list(normalize_raw.enforce_unique_names(rows))
        self.assertEqual(len(deduped), 2)
        self.assertEqual(deduped[0]["source"], "usda_fooddata_central_survey")
        self.assertEqual(deduped[1]["name"], "Banana, raw")

    def test_enforce_unique_names_ignores_nonsemantic_punctuation(self):
        rows = [
            {"name": "Oregano, dried", "source": "cofid", "calories": 265.0},
            {
                "name": "Oregano dried",
                "source": "usda_fooddata_central_sr_legacy",
                "calories": 265.0,
            },
        ]

        deduped = list(normalize_raw.enforce_unique_names(rows))

        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0]["source"], "usda_fooddata_central_sr_legacy")

    def test_name_key_preserves_semantically_meaningful_symbols(self):
        self.assertNotEqual(
            normalize_raw.normalize_name_key("Margarine <17% saturated fat"),
            normalize_raw.normalize_name_key("Margarine >17% saturated fat"),
        )

    def test_enforce_display_safety_requires_calories_and_macros(self):
        valid = {
            "name": "Apple raw",
            "calories": 52.0,
            "protein": 0.3,
            "total_fat": 0.2,
            "carbohydrates_total": 14.0,
        }
        rows = [
            valid,
            {**valid, "name": "Missing carbs", "carbohydrates_total": None},
            {**valid, "name": "Impossible energy", "calories": 0.0},
            {**valid, "name": "Too much fat", "total_fat": 101.0},
        ]

        self.assertEqual(list(normalize_raw.enforce_display_safety(rows)), [valid])

    def test_enforce_unique_names_prefers_more_complete_non_usda(self):
        rows = [
            {"name": "Apple, raw", "source": "cofid", "calories": 52.0},
            {
                "name": " apple,   RAW ",
                "source": "nevo2025",
                "calories": 52.0,
                "protein": 0.3,
            },
            {"name": "Banana, raw"},
            {"name": None},
            {"name": None},
        ]
        deduped = list(normalize_raw.enforce_unique_names(rows))
        self.assertEqual(len(deduped), 4)
        self.assertEqual(deduped[0]["source"], "nevo2025")
        self.assertEqual(deduped[1]["name"], "Banana, raw")
        self.assertIsNone(deduped[2]["name"])
        self.assertIsNone(deduped[3]["name"])


if __name__ == "__main__":
    unittest.main()
