import json
import tempfile
import unittest
from pathlib import Path

from titan.common.nutrients import tracked_nutrient_units, write_tracked_nutrient_units
from titan.nutrient_mapping import CORE_FIELD_UNITS, CORE_FOOD_FIELDS


class NutrientsOutputTests(unittest.TestCase):
    def test_tracked_nutrient_units_filters_non_nutrient_fields(self):
        rows = tracked_nutrient_units(CORE_FOOD_FIELDS, CORE_FIELD_UNITS)
        fields = [row["field"] for row in rows]

        self.assertNotIn("source_id", fields)
        self.assertNotIn("source", fields)
        self.assertNotIn("name", fields)
        self.assertNotIn("portions", fields)
        self.assertIn("calories", fields)
        self.assertIn("protein", fields)

    def test_write_tracked_nutrient_units_writes_json_payload(self):
        with tempfile.TemporaryDirectory(prefix="regolith-nutrients-") as temp_dir:
            output_path = write_tracked_nutrient_units(
                Path(temp_dir),
                CORE_FOOD_FIELDS,
                CORE_FIELD_UNITS,
            )

            self.assertEqual(output_path, Path(temp_dir) / "nutrient-units.json")

            with output_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)

        nutrients = payload.get("nutrients")
        self.assertIsInstance(nutrients, list)

        expected_count = sum(
            1 for field in CORE_FOOD_FIELDS if CORE_FIELD_UNITS[field] is not None
        )
        self.assertEqual(len(nutrients), expected_count)
        self.assertEqual(nutrients[0], {"field": "calories", "unit": "kcal"})
        self.assertIn({"field": "selenium", "unit": "mcg"}, nutrients)


if __name__ == "__main__":
    unittest.main()
