import unittest

from nutrition_ingest.common.units import (
    convert_numeric_value,
    extract_unit_from_label,
    normalize_unit_token,
)
from nutrition_ingest.nutrient_mapping import CORE_FIELD_UNITS


class UnitNormalizationTests(unittest.TestCase):
    def test_normalize_unit_token(self):
        self.assertEqual(normalize_unit_token("µg"), "mcg")
        self.assertEqual(normalize_unit_token("kCal"), "kcal")
        self.assertEqual(normalize_unit_token("kJ"), "kj")

    def test_extract_unit_from_label(self):
        self.assertEqual(extract_unit_from_label("Energy (kcal) (kcal)"), "kcal")
        self.assertEqual(extract_unit_from_label("Retinol (µg)"), "mcg")
        self.assertEqual(extract_unit_from_label("Protein"), None)

    def test_mass_and_energy_conversion(self):
        self.assertAlmostEqual(
            convert_numeric_value(1200.0, "mg", "g", field="protein"),
            1.2,
            places=9,
        )
        self.assertAlmostEqual(
            convert_numeric_value(418.4, "kJ", "kcal", field="calories"),
            100.0,
            places=9,
        )

    def test_iu_conversion_for_supported_fields(self):
        self.assertAlmostEqual(
            convert_numeric_value(100.0, "IU", "mcg", field="vitamin_d_calciferol"),
            2.5,
            places=9,
        )
        self.assertAlmostEqual(
            convert_numeric_value(100.0, "IU", "mcg", field="vitamin_a_retinol"),
            30.0,
            places=9,
        )

    def test_core_units_selected_fields(self):
        self.assertEqual(CORE_FIELD_UNITS["calories"], "kcal")
        self.assertEqual(CORE_FIELD_UNITS["selenium"], "mcg")
        self.assertEqual(CORE_FIELD_UNITS["choline"], "mg")
        self.assertEqual(CORE_FIELD_UNITS["carbohydrates_net_calculated"], "g")

    def test_unknown_source_unit_fails_closed(self):
        with self.assertRaisesRegex(RuntimeError, "Unknown source unit"):
            convert_numeric_value(1.0, None, "g", field="protein")


if __name__ == "__main__":
    unittest.main()
