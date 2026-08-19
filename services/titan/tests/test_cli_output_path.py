import unittest
from pathlib import Path

from titan.common.cli import resolve_output_path


class ResolveOutputPathTests(unittest.TestCase):
    def test_default_output_path(self):
        self.assertEqual(resolve_output_path(None, "usda"), Path("data/outputs/v2/usda.jsonl"))

    def test_stdout_output_path(self):
        self.assertIsNone(resolve_output_path("-", "usda"))

    def test_custom_output_path(self):
        self.assertEqual(resolve_output_path("tmp/custom.jsonl", "usda"), Path("tmp/custom.jsonl"))


if __name__ == "__main__":
    unittest.main()
