import tempfile
import unittest
from pathlib import Path

from release_fixture import write_release

from nutrition_ingest.common.postgres import (
    _database_url,
    _index_ddl,
    _schema_ddl,
    load_verified_manifest,
)
from nutrition_ingest.common.schema import CORE_FOOD_FIELDS, json_schema
from nutrition_ingest.common.validation import validate_normalized_row


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
    def test_database_url_ignores_node_only_libpq_option(self):
        self.assertEqual(
            _database_url("postgresql://user:pass@host/db?sslmode=require&uselibpqcompat=true"),
            "postgresql://user:pass@host/db?sslmode=require",
        )

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

    def test_manifest_verification(self):
        with tempfile.TemporaryDirectory(prefix="mons-manifest-test-") as directory:
            catalog, manifest_path = write_release(
                Path(directory),
                [valid_row("raw")],
                [{**valid_row("branded"), "brand": "Brand", "gtin": "00012345678905"}],
            )
            manifest = load_verified_manifest(catalog, manifest_path)
            self.assertEqual(manifest["counts"]["raw"], 1)

    def test_postgres_ddl_uses_partitions(self):
        ddl = _schema_ddl("mons_stage_test")
        self.assertIn("PARTITION BY LIST (dataset_kind)", ddl)
        self.assertIn("raw_foods PARTITION OF", ddl)
        self.assertIn("branded_foods PARTITION OF", ddl)
        self.assertIn("raw_portions PARTITION OF", ddl)
        self.assertIn("branded_portions PARTITION OF", ddl)
        self.assertIn("search_document tsvector GENERATED ALWAYS", ddl)
        self.assertIn("catalog_metadata", ddl)
        self.assertNotIn("manifest jsonb", ddl)
        self.assertNotIn("singleton", ddl)
        self.assertNotIn("ingestion_run_id", ddl)
        indexes = "\n".join(_index_ddl("mons_stage_test"))
        self.assertIn("raw_foods_search_document_idx", indexes)
        self.assertIn("branded_foods_search_document_idx", indexes)
        self.assertNotIn("UNIQUE (dataset_kind, source, source_id)", ddl)


if __name__ == "__main__":
    unittest.main()
