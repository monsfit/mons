import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from titan.common.output import write_jsonl
from titan.common.postgres import _schema_ddl, default_manifest_path, load_verified_manifest
from titan.common.schema import CORE_FOOD_FIELDS, SCHEMA_VERSION, json_schema
from titan.common.validation import validate_normalized_row


def valid_row(source_id: str = "1") -> dict:
    row = {field: None for field in CORE_FOOD_FIELDS}
    row.update(
        {
            "source_id": source_id,
            "source": "test_source",
            "name": f"Food {source_id}",
            "portions": [{"name": "serving", "amount": 30.0, "unit": "g"}],
            "calories": 100.0,
            "protein": 5.0,
        }
    )
    return row


class ValidationOutputTests(unittest.TestCase):
    def test_schema_and_row_validation(self):
        schema = json_schema()
        self.assertEqual(schema["additionalProperties"], False)
        self.assertEqual(set(schema["required"]), set(CORE_FOOD_FIELDS))
        self.assertEqual(validate_normalized_row(valid_row()), [])

    def test_negative_nutrient_is_source_value_error(self):
        row = valid_row()
        row["protein"] = -1.0
        issues = validate_normalized_row(row)
        self.assertEqual([issue.code for issue in issues], ["negative_nutrient"])

    def test_nul_text_is_a_contract_error(self):
        row = valid_row()
        row["name"] = "bad\x00name"
        issues = validate_normalized_row(row)
        self.assertEqual([issue.code for issue in issues], ["nul_in_text"])

    def test_atomic_writer_creates_manifest_and_rejects(self):
        with tempfile.TemporaryDirectory(prefix="regolith-output-test-") as directory:
            output = Path(directory) / "foods.jsonl"
            bad = valid_row("2")
            bad["protein"] = -1.0
            report = write_jsonl(
                [valid_row(), bad],
                output,
                source_name="test",
                max_rejected_fraction=1.0,
            )

            self.assertEqual(report.emitted, 1)
            self.assertEqual(report.rejected, 1)
            manifest_path = Path(directory) / "foods.manifest.json"
            rejects_path = Path(directory) / "foods.rejected.jsonl"
            self.assertTrue(manifest_path.is_file())
            self.assertTrue(rejects_path.is_file())
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["schema_version"], SCHEMA_VERSION)
            self.assertEqual(manifest["status"], "success")
            self.assertEqual(manifest["counts"]["rejected"], 1)
            self.assertEqual(
                manifest["output"]["sha256"],
                hashlib.sha256(output.read_bytes()).hexdigest(),
            )

    def test_output_bytes_are_deterministic_across_runs(self):
        with tempfile.TemporaryDirectory(prefix="regolith-output-test-") as directory:
            root = Path(directory)
            first = root / "first.jsonl"
            second = root / "second.jsonl"
            rows = [valid_row("1"), valid_row("2")]

            write_jsonl(iter(rows), first, source_name="test")
            write_jsonl(iter(rows), second, source_name="test")

            self.assertEqual(first.read_bytes(), second.read_bytes())
            first_manifest = json.loads((root / "first.manifest.json").read_text())
            second_manifest = json.loads((root / "second.manifest.json").read_text())
            self.assertEqual(
                first_manifest["output"]["sha256"],
                second_manifest["output"]["sha256"],
            )

    def test_contract_failure_preserves_previous_output(self):
        with tempfile.TemporaryDirectory(prefix="regolith-output-test-") as directory:
            output = Path(directory) / "foods.jsonl"
            output.write_text("previous\n")
            invalid = valid_row()
            invalid.pop("protein")

            with self.assertRaisesRegex(RuntimeError, "contract error"):
                write_jsonl([invalid], output, source_name="test")

            self.assertEqual(output.read_text(), "previous\n")
            self.assertTrue(list(Path(directory).glob("foods.failed-*.manifest.json")))

    def test_manifest_verification(self):
        with tempfile.TemporaryDirectory(prefix="regolith-manifest-test-") as directory:
            output = Path(directory) / "foods.jsonl"
            write_jsonl([valid_row()], output, source_name="test")
            manifest = load_verified_manifest(output, default_manifest_path(output))
            self.assertEqual(manifest["output"]["rows"], 1)

    def test_postgres_ddl_uses_partitions(self):
        ddl = _schema_ddl("regolith_stage_test")
        self.assertIn("PARTITION BY LIST (dataset_kind)", ddl)
        self.assertIn("raw_foods PARTITION OF", ddl)
        self.assertIn("branded_foods PARTITION OF", ddl)
        self.assertIn("raw_portions PARTITION OF", ddl)
        self.assertIn("branded_portions PARTITION OF", ddl)
        self.assertNotIn("UNIQUE (dataset_kind, source, source_id)", ddl)


if __name__ == "__main__":
    unittest.main()
