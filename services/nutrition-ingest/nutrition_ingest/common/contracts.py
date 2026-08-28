from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class FieldKind(str, Enum):
    LITERAL = "literal"
    SOURCE = "source"
    NUTRIENT_ID = "nutrient_id"
    COMPUTED = "computed"
    MISSING = "missing"


@dataclass(frozen=True)
class FieldSpec:
    kind: FieldKind
    source: str | int | None = None
    fallback_sources: tuple[str | int, ...] = ()
    fallback_mode: str = "first"
    metadata: dict[str, Any] = field(default_factory=dict)

    def as_string_source(self) -> str | None:
        if isinstance(self.source, str):
            return self.source
        return None
