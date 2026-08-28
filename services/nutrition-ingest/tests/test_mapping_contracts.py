import unittest

from nutrition_ingest.common.contracts import FieldKind
from nutrition_ingest.nutrient_mapping import (
    AUSTRALIA_FIELD_SPECS,
    CORE_FIELD_UNITS,
    CORE_FOOD_FIELDS,
    USDA_FIELD_SPECS,
)


class MappingContractTests(unittest.TestCase):
    def test_all_core_fields_present_for_usda(self):
        self.assertEqual(set(CORE_FOOD_FIELDS), set(USDA_FIELD_SPECS.keys()))

    def test_all_core_fields_present_for_australia(self):
        self.assertEqual(set(CORE_FOOD_FIELDS), set(AUSTRALIA_FIELD_SPECS.keys()))

    def test_all_core_fields_have_unit_contract(self):
        self.assertEqual(set(CORE_FOOD_FIELDS), set(CORE_FIELD_UNITS.keys()))

    def test_usda_has_nutrient_specs(self):
        self.assertEqual(USDA_FIELD_SPECS["calories"].kind, FieldKind.NUTRIENT_ID)
        self.assertEqual(USDA_FIELD_SPECS["source"].kind, FieldKind.LITERAL)

    def test_usda_vitamin_b6_uses_reported_total(self):
        self.assertEqual(USDA_FIELD_SPECS["vitamin_b6"].source, 1175)

    def test_usda_omega_6_total_is_not_total_pufa(self):
        self.assertEqual(USDA_FIELD_SPECS["omega_6_total_reported"].kind, FieldKind.MISSING)
        self.assertEqual(USDA_FIELD_SPECS["omega_6_linoleic_acid"].source, 1316)


if __name__ == "__main__":
    unittest.main()
