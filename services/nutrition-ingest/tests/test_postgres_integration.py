import os
import tempfile
import unittest
from pathlib import Path

from release_fixture import write_release

from nutrition_ingest.common.postgres import ingest, status
from nutrition_ingest.common.schema import CORE_FOOD_FIELDS


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
        runtime_role = f"mons_runtime_{os.getpid()}"

        import psycopg

        def drop_test_schema():
            with psycopg.connect(database_url) as connection:
                connection.execute(f'DROP SCHEMA IF EXISTS "{test_schema}" CASCADE')
                connection.execute(f'DROP ROLE IF EXISTS "{runtime_role}"')

        drop_test_schema()
        self.addCleanup(drop_test_schema)
        with psycopg.connect(database_url) as connection:
            connection.execute(f'CREATE ROLE "{runtime_role}"')
        with tempfile.TemporaryDirectory(prefix="mons-postgres-test-") as directory:
            root = Path(directory)
            catalog, manifest = write_release(
                root,
                [food("raw-1", branded=False)],
                [food("branded-1", branded=True)],
            )

            result = ingest(
                catalog_path=catalog,
                manifest_path=manifest,
                database_url=database_url,
                runtime_role=runtime_role,
                active_schema=test_schema,
            )
            self.assertEqual(result["raw_rows"], 1)
            self.assertEqual(result["branded_rows"], 1)
            active = status(database_url, active_schema=test_schema)
            self.assertEqual(active["counts"], {"raw": 1, "branded": 1})
            active_release = active["release"]["release_id"]
            self.assertEqual(active_release, "2026-08-27-a1b2c3d4")
            with psycopg.connect(database_url) as connection:
                self.assertTrue(
                    connection.execute(
                        "SELECT has_schema_privilege(%s, %s, 'USAGE')",
                        (runtime_role, test_schema),
                    ).fetchone()[0]
                )

            repeated = ingest(
                catalog_path=catalog,
                manifest_path=manifest,
                database_url=database_url,
                runtime_role=runtime_role,
                active_schema=test_schema,
            )
            self.assertFalse(repeated["loaded"])

            with catalog.open("ab") as handle:
                handle.write(b"bad")
            with self.assertRaisesRegex(RuntimeError, "hash does not match"):
                ingest(
                    catalog_path=catalog,
                    manifest_path=manifest,
                    database_url=database_url,
                    runtime_role=runtime_role,
                    active_schema=test_schema,
                )

            self.assertEqual(
                status(database_url, active_schema=test_schema)["release"]["release_id"],
                active_release,
            )


if __name__ == "__main__":
    unittest.main()
