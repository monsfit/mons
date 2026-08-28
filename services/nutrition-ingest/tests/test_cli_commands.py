import unittest

from nutrition_ingest.cli import build_parser


class CliCommandTests(unittest.TestCase):
    def test_release_commands_are_registered(self):
        parser = build_parser()
        self.assertTrue(callable(parser.parse_args(["build"]).handler))
        self.assertTrue(callable(parser.parse_args(["publish"]).handler))
        self.assertTrue(callable(parser.parse_args(["status"]).handler))
        self.assertTrue(
            callable(parser.parse_args(["load", "--release", "2026-08-27-a1b2c3d4"]).handler)
        )

    def test_source_parser_commands_are_not_public(self):
        parser = build_parser()
        with self.assertRaises(SystemExit):
            parser.parse_args(["normalize-raw"])


if __name__ == "__main__":
    unittest.main()
