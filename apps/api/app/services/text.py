"""Shared text helpers (ported from src/nl/foods.ts)."""

import re

_NON_ALNUM = re.compile(r"[^a-z0-9\s]")
_SPACES = re.compile(r"\s+")


def norm(s: str) -> str:
    return _SPACES.sub(" ", _NON_ALNUM.sub(" ", s.lower())).strip()


def stem(w: str) -> str:
    """Strip simple plurals: "pizzas" -> "pizza", "tomatoes" -> "tomato", but keep "glasses"-style words."""
    if len(w) > 3 and w.endswith("es") and not w.endswith("ses"):
        return w[:-2]
    if len(w) > 3 and w.endswith("s"):
        return w[:-1]
    return w


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
