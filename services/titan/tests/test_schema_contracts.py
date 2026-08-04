import json
import tempfile
import unittest
from pathlib import Path

from titan.schema_contracts import write_schemas


class SchemaContractTests(unittest.TestCase):
    def test_generated_schemas_are_deterministic_and_distinguish_branded_foods(self):
        with tempfile.TemporaryDirectory(prefix="titan-schema-test-") as directory:
            output_directory = Path(directory)
            raw_path, branded_path = write_schemas(output_directory)
            first_bytes = (raw_path.read_bytes(), branded_path.read_bytes())
            write_schemas(output_directory)

            self.assertEqual(first_bytes, (raw_path.read_bytes(), branded_path.read_bytes()))
            raw = json.loads(raw_path.read_text(encoding="utf-8"))
            branded = json.loads(branded_path.read_text(encoding="utf-8"))
            self.assertNotIn("gtin", raw["properties"])
            self.assertEqual(branded["properties"]["gtin"]["pattern"], "^[0-9]{14}$")
            self.assertIn("brand", branded["required"])
            self.assertEqual(raw["properties"]["protein"]["minimum"], 0)
            self.assertEqual(raw["properties"]["protein"]["x-regolith-unit"], "g")
            self.assertEqual(raw["x-regolith-nutrient-basis"], {"amount": 100.0, "unit": "g"})
            self.assertEqual(raw["properties"]["name"]["type"], "string")


if __name__ == "__main__":
    unittest.main()
