from __future__ import annotations

import io
import json
import zipfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any, TextIO


def iter_root_array(
    handle: TextIO, root_key: str, chunk_size: int = 65536
) -> Iterator[dict[str, Any]]:
    """Incrementally decode objects from a named top-level JSON array."""

    decoder = json.JSONDecoder()
    buffer = ""
    token = f'"{root_key}"'
    search_window = max(4096, len(token) * 8)

    while True:
        token_index = buffer.find(token)
        if token_index != -1:
            array_start = buffer.find("[", token_index)
            if array_start != -1:
                buffer = buffer[array_start + 1 :]
                break
        chunk = handle.read(chunk_size)
        if chunk == "":
            raise RuntimeError(f"JSON stream is missing expected root array: {root_key}")
        buffer += chunk
        if len(buffer) > search_window and token not in buffer:
            buffer = buffer[-search_window:]

    while True:
        stripped = buffer.lstrip()
        if stripped.startswith("]"):
            return
        if stripped.startswith(","):
            buffer = stripped[1:]
            continue
        try:
            value, offset = decoder.raw_decode(stripped)
            buffer = stripped[offset:]
        except json.JSONDecodeError:
            chunk = handle.read(chunk_size)
            if chunk == "":
                raise RuntimeError(f"Unexpected end of JSON while parsing {root_key}")
            buffer = stripped + chunk
            continue
        if isinstance(value, dict):
            yield value


def select_json_member(zip_path: Path, hint: str | None = None) -> str:
    with zipfile.ZipFile(zip_path, "r") as archive:
        members = [name for name in archive.namelist() if name.casefold().endswith(".json")]
    if not members:
        raise RuntimeError(f"No JSON member found in ZIP archive: {zip_path}")
    if hint:
        hinted = [name for name in members if hint.casefold() in name.casefold()]
        if hinted:
            return hinted[0]
    return members[0]


def iter_json_source(
    path: Path, root_key: str, *, member_hint: str | None = None
) -> Iterator[dict[str, Any]]:
    if path.suffix.casefold() == ".zip":
        member = select_json_member(path, member_hint)
        with zipfile.ZipFile(path, "r") as archive:
            with archive.open(member, "r") as raw_handle:
                with io.TextIOWrapper(raw_handle, encoding="utf-8") as text_handle:
                    yield from iter_root_array(text_handle, root_key)
        return

    with path.open("r", encoding="utf-8") as handle:
        yield from iter_root_array(handle, root_key)
