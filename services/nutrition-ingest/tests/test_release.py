import io
import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

import pyarrow.parquet as pq
from botocore.exceptions import ClientError
from release_fixture import write_release
from test_validation_output import valid_row

from nutrition_ingest.r2 import publish_release
from nutrition_ingest.release import _release_id, sha256_file, write_catalog_parquet


class FakeS3:
    def __init__(self):
        self.objects = {}
        self.operations = []

    def head_bucket(self, **_kwargs):
        return {}

    def head_object(self, *, Bucket, Key):
        del Bucket
        if Key not in self.objects:
            raise ClientError(
                {"ResponseMetadata": {"HTTPStatusCode": 404}, "Error": {"Code": "404"}},
                "HeadObject",
            )
        body, metadata = self.objects[Key]
        return {"ContentLength": len(body), "Metadata": metadata}

    def upload_file(self, filename, bucket, key, ExtraArgs):
        del bucket
        self.operations.append(key)
        self.objects[key] = (Path(filename).read_bytes(), ExtraArgs["Metadata"])

    def put_object(self, *, Bucket, Key, Body, Metadata, **_kwargs):
        del Bucket
        self.operations.append(Key)
        self.objects[Key] = (bytes(Body), Metadata)

    def get_object(self, *, Bucket, Key):
        del Bucket
        return {"Body": io.BytesIO(self.objects[Key][0])}


class ReleaseTests(unittest.TestCase):
    def test_catalog_contains_both_dataset_kinds(self):
        with tempfile.TemporaryDirectory(prefix="mons-release-test-") as directory:
            root = Path(directory)
            catalog = root / "foods.parquet"
            rejects = root / "rejects.jsonl"
            branded = {
                **valid_row("branded"),
                "brand": "Brand",
                "gtin": "00012345678905",
            }

            reports, logical_hash = write_catalog_parquet(
                [valid_row("raw")], [branded], catalog, rejects
            )

            table = pq.read_table(catalog)
            self.assertEqual(table.num_rows, 2)
            self.assertEqual(table.column("dataset_kind").to_pylist(), ["raw", "branded"])
            self.assertEqual(reports["raw"].emitted, 1)
            self.assertEqual(reports["branded"].emitted, 1)
            self.assertEqual(len(logical_hash), 64)
            self.assertEqual(rejects.read_text(), "")

    def test_release_id_is_content_deterministic(self):
        built_at = datetime(2026, 8, 27, tzinfo=UTC)
        self.assertEqual(_release_id("catalog", built_at), _release_id("catalog", built_at))
        self.assertNotEqual(_release_id("catalog", built_at), _release_id("changed", built_at))

    def test_publish_is_immutable_and_idempotent(self):
        with tempfile.TemporaryDirectory(prefix="mons-publish-test-") as directory:
            root = Path(directory)
            source = root / "source.txt"
            source.write_text("source")
            catalog, manifest_path = write_release(
                root,
                [valid_row("raw")],
                [{**valid_row("branded"), "brand": "Brand", "gtin": "00012345678905"}],
            )

            manifest = json.loads(manifest_path.read_text())
            manifest["sources"] = [
                {
                    "path": str(source),
                    "bytes": source.stat().st_size,
                    "sha256": sha256_file(source),
                }
            ]
            manifest_path.write_text(json.dumps(manifest) + "\n")

            fake = FakeS3()
            with patch("nutrition_ingest.r2.client", return_value=fake):
                first = publish_release(manifest_path)
                second = publish_release(manifest_path)
                self.assertTrue(first["published"])
                self.assertFalse(second["published"])
                self.assertIn(f"releases/{manifest['release_id']}/{catalog.name}", fake.operations)
                self.assertTrue(fake.operations[-1].endswith("/manifest.json"))

                manifest["counts"]["raw"] = 99
                manifest_path.write_text(json.dumps(manifest) + "\n")
                with self.assertRaisesRegex(RuntimeError, "conflicts"):
                    publish_release(manifest_path)


if __name__ == "__main__":
    unittest.main()
