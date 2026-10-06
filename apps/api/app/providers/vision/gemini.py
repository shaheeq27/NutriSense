"""Gemini-backed vision provider for food identification.

Sends an image plus the NutriSense food-slug library to Gemini and asks it
to rank the best-matching slugs.  Uses the REST API via httpx (already a
project dependency) so no extra SDK is required.
"""

from __future__ import annotations

import base64
import json
import logging
import re

import httpx

from app.providers.vision.base import VisionGuess

logger = logging.getLogger(__name__)

_MODEL = "gemini-3.5-flash"
_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{_MODEL}:generateContent"
)

_SYSTEM_PROMPT = """\
You are an expert food-image classification assistant.
You will receive:
  1. A food photograph.
  2. A JSON array of known candidate food slugs (lowercase-hyphenated identifiers,
     e.g. "chicken-biryani", "masala-dosa", "banana").

Your ONLY job is to identify if the image contains food, and if so, identify the food.
You must NEVER invent nutrition facts, calories, or portion sizes.

Rules:
1. You MUST explicitly reject the following by returning an empty array []:
   - logos
   - icons
   - screenshots
   - drawings/illustrations
   - non-food objects
   - empty or background images
2. If the image is ambiguous or you cannot confidently identify the food, return an empty array [].
3. Food identity rules:
   - If the food matches one of the candidate slugs in the provided list, use that exact candidate slug as the "label".
   - If the food is clearly recognizable real food but NOT in the provided candidate list (e.g. "cucumber", "carrot", "avocado", "blueberries", "oats"), provide a clean, concise, normalized lowercase food name as the "label".
   - NEVER return arbitrary prose, full sentences, or vague descriptors like "brown food in a bowl", "plate with food", "mixed meal". Return ONLY the specific food name.
4. Return a JSON array of objects ranking the best-matching food identities.
   Each object MUST have exactly two keys:
     "label"      – the candidate slug or normalized food name.
     "confidence" – a float between 0.0 and 1.0.
5. Return at most 5 candidates, ordered by descending confidence.
6. Return ONLY the JSON array — no markdown fences, no commentary.
"""


class GeminiVisionProvider:
    """Calls the Gemini REST API to match a food image against library slugs."""

    name = "gemini"

    def __init__(self, api_key: str, *, model: str = _MODEL, timeout: float = 60.0) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY must be set to use GeminiVisionProvider")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    # ------------------------------------------------------------------ #
    #  VisionProvider protocol
    # ------------------------------------------------------------------ #
    def identify(
        self,
        image: bytes,
        filename: str | None,
        labels: list[str],
    ) -> list[VisionGuess]:
        from app.providers.vision.base import VisionProviderError

        if not labels:
            return []

        mime_type = _guess_mime(filename)
        encoded = base64.b64encode(image).decode("ascii")

        payload = {
            "systemInstruction": {"parts": [{"text": _SYSTEM_PROMPT}]},
            "contents": [
                {
                    "parts": [
                        {"inlineData": {"mimeType": mime_type, "data": encoded}},
                        {"text": f"Candidate slugs:\n{json.dumps(labels)}"},
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 1024,
            },
        }

        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent"
        url = f"{endpoint}?key={self._api_key}"

        try:
            resp = httpx.post(url, json=payload, timeout=self._timeout)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            _safe = str(exc).replace(self._api_key, "REDACTED")
            logger.error("Gemini HTTP error: %s", _safe)
            code = "vision_auth_error" if exc.response.status_code in (401, 403) else "vision_provider_error"
            raise VisionProviderError(f"Gemini API failure: {_safe}", code=code) from None
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            logger.error("Gemini network error: %s", exc)
            raise VisionProviderError(f"Gemini network failure: {exc}") from None

        try:
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            logger.warning("Unexpected Gemini response structure")
            raise VisionProviderError("Malformed response from Gemini API")

        return _parse(raw_text, frozenset(labels))


# ---------------------------------------------------------------------- #
#  Helpers
# ---------------------------------------------------------------------- #
_MIME_MAP = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "heic": "image/heic",
}


def _guess_mime(filename: str | None) -> str:
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        return _MIME_MAP.get(ext, "image/jpeg")
    return "image/jpeg"


_DISALLOWED_TERMS = frozenset([
    "food", "dish", "meal", "plate", "bowl", "snack", "breakfast", 
    "lunch", "dinner", "edible", "something", "unknown", "object", "item",
    "logo", "icon", "drawing", "screenshot", "illustration", "image", "photo"
])


def _is_valid_food_name(name: str) -> bool:
    """Validate a non-candidate food label is a clean, normalized food name."""
    if not name or len(name) < 2 or len(name) > 40:
        return False
    if not re.match(r"^[a-z]+([ -][a-z]+)*$", name):
        return False
    words = name.replace("-", " ").split()
    if len(words) > 4:
        return False
    if any(w in _DISALLOWED_TERMS for w in words):
        return False
    return True


def _parse(raw: str, valid_labels: frozenset[str], *, allow_uncataloged: bool = True) -> list[VisionGuess]:
    """Best-effort JSON extraction, filtering to valid candidate slugs or clean normalized food names."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`")
    try:
        items = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Gemini returned unparseable payload: %.200s", raw)
        return []
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        return []

    seen: set[str] = set()
    guesses: list[VisionGuess] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        raw_label = item.get("label", "")
        if not isinstance(raw_label, str):
            continue
        label = raw_label.strip().lower()
        if not label or label in seen:
            continue
        # Check candidate list or uncataloged food name
        if label not in valid_labels:
            if not allow_uncataloged or not _is_valid_food_name(label):
                continue
        seen.add(label)
        try:
            conf = float(item.get("confidence", 0))
        except (TypeError, ValueError):
            conf = 0.0
        guesses.append(VisionGuess(label=label, confidence=max(0.0, min(1.0, conf))))
    return guesses
