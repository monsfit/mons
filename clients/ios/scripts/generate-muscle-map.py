#!/usr/bin/env python3
"""Generate normalized native path data from the canonical Mons muscle-map SVG."""

from __future__ import annotations

import json
import re
from pathlib import Path
from xml.etree import ElementTree


SCRIPT_DIRECTORY = Path(__file__).resolve().parent
APP_DIRECTORY = SCRIPT_DIRECTORY.parent / "mons"
SOURCE_PATH = APP_DIRECTORY / "Workouts/Resources/MuscleMap/MonsMuscleMap.svg"
OUTPUT_PATH = APP_DIRECTORY / "Workouts/Resources/MuscleMap/MonsMuscleMapPaths.json"

SVG_NAMESPACE = "http://www.w3.org/2000/svg"
TOKEN_PATTERN = re.compile(
    r"[MmLlHhVvCcZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?"
)
TRANSFORM_PATTERN = re.compile(r"(translate|scale)\(([^)]+)\)")

VIEW_FRAMES = {
    "male-front-view": (25.0, 84.0, 240.0, 474.0),
    "male-back-view": (295.0, 84.0, 240.0, 474.0),
    "female-front-view": (565.0, 84.0, 240.0, 474.0),
    "female-back-view": (835.0, 84.0, 240.0, 474.0),
}


def multiply(
    lhs: tuple[float, float, float, float, float, float],
    rhs: tuple[float, float, float, float, float, float],
) -> tuple[float, float, float, float, float, float]:
    a1, b1, c1, d1, e1, f1 = lhs
    a2, b2, c2, d2, e2, f2 = rhs
    return (
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    )


def parse_transform(value: str | None) -> tuple[float, float, float, float, float, float]:
    matrix = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)
    for name, raw_values in TRANSFORM_PATTERN.findall(value or ""):
        values = [float(item) for item in re.split(r"[\s,]+", raw_values.strip())]
        if name == "translate":
            operation = (1.0, 0.0, 0.0, 1.0, values[0], values[1] if len(values) > 1 else 0.0)
        else:
            operation = (values[0], 0.0, 0.0, values[1] if len(values) > 1 else values[0], 0.0, 0.0)
        matrix = multiply(matrix, operation)
    return matrix


def transform_point(
    point: tuple[float, float],
    matrix: tuple[float, float, float, float, float, float],
) -> tuple[float, float]:
    x, y = point
    a, b, c, d, e, f = matrix
    return (a * x + c * y + e, b * x + d * y + f)


def parse_path(path_data: str) -> list[tuple[str, tuple[float, ...]]]:
    tokens = TOKEN_PATTERN.findall(path_data)
    commands: list[tuple[str, tuple[float, ...]]] = []
    current_x = 0.0
    current_y = 0.0
    start_x = 0.0
    start_y = 0.0
    command = ""
    index = 0

    while index < len(tokens):
        token = tokens[index]
        if token.isalpha():
            command = token
            index += 1

        if command in "Zz":
            commands.append(("Z", ()))
            current_x, current_y = start_x, start_y
            command = ""
            continue

        if command in "MmLl":
            x = float(tokens[index])
            y = float(tokens[index + 1])
            index += 2
            if command.islower():
                x += current_x
                y += current_y
            kind = "M" if command in "Mm" else "L"
            commands.append((kind, (x, y)))
            current_x, current_y = x, y
            if kind == "M":
                start_x, start_y = x, y
                command = "l" if command == "m" else "L"
            continue

        if command in "Hh":
            x = float(tokens[index])
            index += 1
            if command == "h":
                x += current_x
            current_x = x
            commands.append(("L", (current_x, current_y)))
            continue

        if command in "Vv":
            y = float(tokens[index])
            index += 1
            if command == "v":
                y += current_y
            current_y = y
            commands.append(("L", (current_x, current_y)))
            continue

        if command in "Cc":
            values = [float(tokens[index + offset]) for offset in range(6)]
            index += 6
            if command == "c":
                values = [
                    values[0] + current_x,
                    values[1] + current_y,
                    values[2] + current_x,
                    values[3] + current_y,
                    values[4] + current_x,
                    values[5] + current_y,
                ]
            commands.append(("C", tuple(values)))
            current_x, current_y = values[4], values[5]
            continue

        raise ValueError(f"Unsupported or malformed SVG path command: {command!r}")

    return commands


def normalized_commands(
    path_data: str,
    matrix: tuple[float, float, float, float, float, float],
    frame: tuple[float, float, float, float],
) -> list[list[float | int]]:
    frame_x, frame_y, frame_width, frame_height = frame
    result: list[list[float | int]] = []

    def normalize(point: tuple[float, float]) -> tuple[float, float]:
        x, y = transform_point(point, matrix)
        return (round((x - frame_x) / frame_width, 7), round((y - frame_y) / frame_height, 7))

    for kind, values in parse_path(path_data):
        if kind == "M":
            x, y = normalize((values[0], values[1]))
            result.append([0, x, y])
        elif kind == "L":
            x, y = normalize((values[0], values[1]))
            result.append([1, x, y])
        elif kind == "C":
            control1 = normalize((values[0], values[1]))
            control2 = normalize((values[2], values[3]))
            end = normalize((values[4], values[5]))
            result.append([2, *control1, *control2, *end])
        else:
            result.append([3])
    return result


def generate() -> None:
    root = ElementTree.parse(SOURCE_PATH).getroot()
    regions: list[dict[str, object]] = []

    for view in root.findall(f"{{{SVG_NAMESPACE}}}g"):
        view_id = view.attrib.get("id", "")
        if view_id not in VIEW_FRAMES:
            continue

        body, side, _ = view_id.split("-")
        view_matrix = parse_transform(view.attrib.get("transform"))

        for path in view.findall(f"{{{SVG_NAMESPACE}}}path"):
            path_matrix = parse_transform(path.attrib.get("transform"))
            title = path.find(f"{{{SVG_NAMESPACE}}}title")
            regions.append(
                {
                    "id": path.attrib["id"],
                    "muscle": path.attrib["data-muscle"],
                    "group": path.attrib["data-group"],
                    "body": body,
                    "side": side,
                    "name": title.text.strip() if title is not None and title.text else path.attrib["data-muscle"],
                    "commands": normalized_commands(
                        path.attrib["d"],
                        multiply(view_matrix, path_matrix),
                        VIEW_FRAMES[view_id],
                    ),
                }
            )

    if len(regions) != 178:
        raise ValueError(f"Expected 178 muscle regions, generated {len(regions)}")

    payload = {"version": 1, "regions": regions}
    OUTPUT_PATH.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Generated {len(regions)} regions at {OUTPUT_PATH}")


if __name__ == "__main__":
    generate()
