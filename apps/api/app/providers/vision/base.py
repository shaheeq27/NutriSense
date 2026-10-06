from dataclasses import dataclass
from typing import Protocol

from app.core.exceptions import DomainError


class VisionProviderError(DomainError):
    """Raised when the underlying vision API fails."""
    status_code = 502
    code = "vision_provider_error"


@dataclass(frozen=True)
class VisionGuess:
    label: str  # food slug in the library
    confidence: float


class VisionProvider(Protocol):
    name: str

    def identify(self, image: bytes, filename: str | None, labels: list[str]) -> list[VisionGuess]: ...
