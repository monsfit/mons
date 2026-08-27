from __future__ import annotations

import itertools
import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

from titan.nutrient_mapping import CORE_FIELD_UNITS, CORE_FOOD_FIELDS, USDA_FIELD_SPECS
from titan.parsers import (
    australia,
    canada,
    cofid,
    merge_off_branded,
    nevo,
    new_zealand,
    normalize_raw,
    usda,
)


class SourceIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo_root = Path(__file__).resolve().parents[3]
        cls.inputs_dir = cls.repo_root / "data" / "inputs"
        cls._temp_dir_ctx = tempfile.TemporaryDirectory(prefix="mons-integration-")
        cls.temp_dir = Path(cls._temp_dir_ctx.name)

    @classmethod
    def tearDownClass(cls):
        cls._temp_dir_ctx.cleanup()

    def _assert_row_shape(self, row):
        self.assertIsNotNone(row)
        self.assertEqual(set(CORE_FOOD_FIELDS), set(row.keys()))

    def _assert_deterministic(self, iterator_factory, *, count: int = 5):
        def snapshot():
            rows = list(itertools.islice(iterator_factory(), count))
            return json.dumps(rows, ensure_ascii=False, sort_keys=True, allow_nan=True)

        first = snapshot()
        second = snapshot()
        self.assertEqual(first, second)
        return json.loads(first)

    def _require_inputs_root(self):
        if not self.inputs_dir.exists():
            self.skipTest(f"Integration inputs missing: {self.inputs_dir}")

    def _find_case_insensitive(self, directory: Path, expected_name: str) -> Path | None:
        expected = expected_name.casefold()
        for candidate in directory.iterdir():
            if candidate.name.casefold() == expected:
                return candidate
        return None

    def _extract_json_from_zip(self, zip_path: Path, hint: str) -> Path | None:
        with zipfile.ZipFile(zip_path, "r") as archive:
            members = [name for name in archive.namelist() if name.casefold().endswith(".json")]
            if not members:
                return None

            hinted = [name for name in members if hint.casefold() in name.casefold()]
            selected_member = hinted[0] if hinted else members[0]

            target_path = self.temp_dir / Path(selected_member).name
            if not target_path.exists():
                with archive.open(selected_member, "r") as source, target_path.open("wb") as target:
                    shutil.copyfileobj(source, target)
            return target_path

    def _resolve_usda_json(self, pattern: str, zip_name: str) -> Path | None:
        direct_candidates = sorted(self.inputs_dir.glob(f"{pattern}*.json"))
        if direct_candidates:
            return direct_candidates[0]

        zip_path = self.inputs_dir / zip_name
        if not zip_path.exists():
            return None

        return self._extract_json_from_zip(zip_path, pattern)

    def test_australia_parser_first_row(self):
        self._require_inputs_root()
        workbook_path = self.inputs_dir / "australian-food-composition-database.xlsx"
        if not workbook_path.exists():
            self.skipTest(f"Missing input file: {workbook_path}")

        row = self._assert_deterministic(lambda: australia.iter_rows(workbook_path))[0]
        self._assert_row_shape(row)
        self.assertEqual(row.get("source"), "australian_food_composition")

    def test_canada_parser_first_row(self):
        self._require_inputs_root()
        cnf_dir = self.inputs_dir / "canadian-nutrient-files"
        if not cnf_dir.exists():
            self.skipTest(f"Missing input directory: {cnf_dir}")

        food_name_path = self._find_case_insensitive(cnf_dir, "FOOD NAME.csv")
        nutrient_name_path = self._find_case_insensitive(cnf_dir, "NUTRIENT NAME.csv")
        nutrient_amount_path = self._find_case_insensitive(cnf_dir, "NUTRIENT AMOUNT.csv")

        if not food_name_path or not nutrient_name_path or not nutrient_amount_path:
            self.skipTest("Missing one or more CNF CSV files")

        row = self._assert_deterministic(
            lambda: canada.iter_rows(food_name_path, nutrient_name_path, nutrient_amount_path)
        )[0]
        self._assert_row_shape(row)
        self.assertEqual(row.get("source"), "canadian_nutrient_file")

    def test_cofid_parser_first_row(self):
        self._require_inputs_root()
        workbook_path = self.inputs_dir / "CoFID.xlsx"
        if not workbook_path.exists():
            self.skipTest(f"Missing input file: {workbook_path}")

        row = self._assert_deterministic(lambda: cofid.iter_rows(workbook_path))[0]
        self._assert_row_shape(row)
        self.assertEqual(row.get("source"), "cofid")

    def test_nevo_parser_first_row(self):
        self._require_inputs_root()
        nevo_dir = self.inputs_dir / "dutch-nutrient-database"
        if not nevo_dir.exists():
            self.skipTest(f"Missing input directory: {nevo_dir}")

        workbook_candidates = sorted(nevo_dir.rglob("*NEVO*.xlsx"))
        if not workbook_candidates:
            workbook_candidates = sorted(nevo_dir.rglob("*.xlsx"))
        if not workbook_candidates:
            self.skipTest("No NEVO workbook found")

        row = self._assert_deterministic(lambda: nevo.iter_rows(workbook_candidates[0]))[0]
        self._assert_row_shape(row)
        self.assertEqual(row.get("source"), "nevo2025")

    def test_new_zealand_parser_first_row(self):
        self._require_inputs_root()
        workbook_path = self.inputs_dir / "new-zealand-food-concise.xlsx"
        if not workbook_path.exists():
            self.skipTest(f"Missing input file: {workbook_path}")

        row = self._assert_deterministic(lambda: new_zealand.iter_rows(workbook_path))[0]
        self._assert_row_shape(row)
        self.assertEqual(row.get("source"), "new_zealand_food_composition")

    def test_usda_parser_first_row(self):
        self._require_inputs_root()

        nutrient_csv_path = self.inputs_dir / "FoodData_Central_csv_2025-04-24" / "nutrient.csv"
        if not nutrient_csv_path.exists():
            self.skipTest(f"Missing USDA nutrient csv: {nutrient_csv_path}")

        survey_json = self._resolve_usda_json(
            "FoodData_Central_survey_food_json", "FoodData_Central_survey_food_json_2024-10-31.zip"
        )
        foundation_json = self._resolve_usda_json(
            "FoodData_Central_foundation_food_json",
            "FoodData_Central_foundation_food_json_2025-04-24.zip",
        )
        sr_legacy_json = self._resolve_usda_json(
            "FoodData_Central_sr_legacy_food_json",
            "FoodData_Central_sr_legacy_food_json_2018-04.zip",
        )

        if not survey_json or not foundation_json or not sr_legacy_json:
            self.skipTest("Missing one or more USDA JSON files (direct or zipped)")

        runtime_map = usda.build_usda_runtime_map(USDA_FIELD_SPECS)
        nutrient_rows_by_id = usda.load_nutrient_rows(nutrient_csv_path)
        usda.validate_mapping_fields(runtime_map, CORE_FOOD_FIELDS)
        usda.validate_mapping_nutrients(runtime_map, CORE_FOOD_FIELDS, nutrient_rows_by_id)
        usda.validate_core_field_units_against_usda(
            runtime_map, nutrient_rows_by_id, CORE_FIELD_UNITS
        )

        rows = self._assert_deterministic(
            lambda: usda.iter_all_usda_rows(
                survey_json,
                foundation_json,
                sr_legacy_json,
                runtime_map,
                CORE_FOOD_FIELDS,
            )
        )
        row = rows[0]
        self._assert_row_shape(row)
        self.assertIn("usda_fooddata_central_", row.get("source", ""))

    def test_merge_off_branded_parser_first_row(self):
        self._require_inputs_root()

        nutrient_csv_path = self.inputs_dir / "FoodData_Central_csv_2025-04-24" / "nutrient.csv"
        if not nutrient_csv_path.exists():
            self.skipTest(f"Missing USDA nutrient csv: {nutrient_csv_path}")

        usda_branded_direct = sorted(self.inputs_dir.glob("FoodData_Central_branded_food_json*.json"))
        usda_branded_zip = sorted(self.inputs_dir.glob("FoodData_Central_branded_food_json*.zip"))
        if usda_branded_direct:
            usda_branded_path = usda_branded_direct[0]
        elif usda_branded_zip:
            usda_branded_path = usda_branded_zip[0]
        else:
            self.skipTest("Missing USDA branded JSON or ZIP input")

        off_parquet_path = self.inputs_dir / "food.parquet"
        if not off_parquet_path.exists():
            self.skipTest(f"Missing Open Food Facts parquet: {off_parquet_path}")

        rows = self._assert_deterministic(
            lambda: merge_off_branded.iter_rows(
                usda_branded_path,
                off_parquet_path,
                nutrient_csv_path,
            )
        )
        row = rows[0]

        self.assertIsNotNone(row)
        self.assertEqual(set(CORE_FOOD_FIELDS + ["gtin", "brand"]), set(row.keys()))
        self.assertIn(row.get("source"), {"usda_fooddata_central_branded", "open_food_facts"})

        mapping = usda.build_usda_runtime_map(USDA_FIELD_SPECS)
        nutrients = usda.load_nutrient_rows(nutrient_csv_path)
        target_units = merge_off_branded.build_target_units(mapping, nutrients)
        off_rows = self._assert_deterministic(
            lambda: merge_off_branded.iter_off_rows(
                off_parquet_path, target_units, CORE_FOOD_FIELDS
            )
        )
        self.assertEqual(off_rows[0]["source"], "open_food_facts")

    def test_normalize_raw_parser_first_row(self):
        self._require_inputs_root()

        default_paths = normalize_raw.build_default_paths(self.inputs_dir)
        missing_paths = [str(path) for path in default_paths.values() if not path.exists()]
        if missing_paths:
            self.skipTest("Missing one or more normalize-raw inputs")

        row = self._assert_deterministic(lambda: normalize_raw.iter_rows(default_paths))[0]
        self._assert_row_shape(row)
        self.assertNotIn(row.get("source"), {"usda_fooddata_central_branded", "open_food_facts"})


if __name__ == "__main__":
    unittest.main()
