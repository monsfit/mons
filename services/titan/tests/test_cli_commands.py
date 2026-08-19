import unittest
from pathlib import Path

from titan.cli import build_parser
from titan.common.cli import resolve_output_path
from titan.parsers import merge_off_branded, normalize_raw


class CliCommandTests(unittest.TestCase):
    def test_normalize_raw_subcommand_registered(self):
        parser = build_parser()
        args = parser.parse_args(["normalize-raw"])

        self.assertEqual(args.source, "normalize-raw")
        self.assertTrue(callable(args.handler))

    def test_default_raw_output_path(self):
        output_path = resolve_output_path(None, normalize_raw.SOURCE_NAME)
        self.assertEqual(output_path, Path("data/outputs/v2/raw-foods.jsonl"))

    def test_default_branded_output_path(self):
        output_path = resolve_output_path(None, merge_off_branded.SOURCE_NAME)
        self.assertEqual(output_path, Path("data/outputs/v2/branded-foods.jsonl"))

    def test_postgres_ingest_uses_schema_v2_snapshots(self):
        args = build_parser().parse_args(["postgres", "ingest"])
        self.assertEqual(args.raw, Path("data/outputs/v2/raw-foods.jsonl"))
        self.assertEqual(args.branded, Path("data/outputs/v2/branded-foods.jsonl"))


if __name__ == "__main__":
    unittest.main()
