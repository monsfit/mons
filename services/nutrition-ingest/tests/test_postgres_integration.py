import json
import os
import tempfile
import unittest
from pathlib import Path

from titan.common.output import write_jsonl
from titan.common.postgres import ingest, status
from titan.common.schema import CORE_FOOD_FIELDS


def food(source_id: str, *, branded: bool) -> dict:
    row = {field: None for field in CORE_FOOD_FIELDS}
    row.update(
        {
            "source_id": source_id,
            "source": "integration_test",
            "name": f"Integration Food {source_id}",
            "portions": [{"name": "serving", "amount": 25.0, "unit": "g"}],
            "calories": 123.0,
            "protein": 4.5,
        }
    )
    if branded:
        row.update({"brand": "Test Brand", "gtin": "00012345678905"})
    return row


@unittest.skipUnless(
    os.environ.get("MONS_TEST_DATABASE_URL"),
    "MONS_TEST_DATABASE_URL is required for Postgres integration tests",
)
class PostgresIntegrationTests(unittest.TestCase):
    def test_ingest_and_atomic_failure(self):
        database_url = os.environ["MONS_TEST_DATABASE_URL"]
        test_schema = f"mons_test_{os.getpid()}"

        import psycopg

        def drop_test_schema():
            with psycopg.connect(database_url) as connection:
                connection.execute(f'DROP SCHEMA IF EXISTS "{test_schema}" CASCADE')

        drop_test_schema()
        self.addCleanup(drop_test_schema)
        with tempfile.TemporaryDirectory(prefix="mons-postgres-test-") as directory:
            root = Path(directory)
            raw = root / "raw-foods.jsonl"
            branded = root / "branded-foods.jsonl"
            write_jsonl([food("raw-1", branded=False)], raw, source_name="raw-foods")
            write_jsonl(
                [food("branded-1", branded=True)],
                branded,
                source_name="branded-foods",
            )

            result = ingest(
                raw_path=raw,
                branded_path=branded,
                database_url=database_url,
                active_schema=test_schema,
            )
            self.assertEqual(result["raw_rows"], 1)
            self.assertEqual(result["branded_rows"], 1)
            active = status(database_url, active_schema=test_schema)
            self.assertEqual(active["counts"], {"raw": 1, "branded": 1})
            active_run = active["run"]["run_id"]

            branded.write_text(branded.read_text() + json.dumps(food("bad", branded=True)) + "\n")
            with self.assertRaisesRegex(RuntimeError, "hash does not match"):
                ingest(
                    raw_path=raw,
                    branded_path=branded,
                    database_url=database_url,
                    active_schema=test_schema,
                )

            self.assertEqual(
                status(database_url, active_schema=test_schema)["run"]["run_id"],
                active_run,
            )


if __name__ == "__main__":
    unittest.main()
