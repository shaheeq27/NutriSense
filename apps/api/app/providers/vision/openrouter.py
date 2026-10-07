"""OpenRouter-backed vision provider for food identification."""

from __future__ import annotations

import base64
import json
import logging
import re

import httpx

from app.providers.vision.base import VisionGuess, VisionProviderError

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "google/gemma-4-31b-it:free"
_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

_SYSTEM_PROMPT = """\
You identify food from an image for a nutrition application.

Return only the food identity.
Do not estimate calories or nutrition.
Do not identify logos, screenshots, drawings, icons, text-only images, or non-food objects.
If the image is not confidently identifiable as food, return an invalid/unresolved result.

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
   - If the food is clearly recognizable real food but NOT in the provided candidate list, provide a clean, concise, normalized lowercase food name as the "label".
4. Return a JSON array of objects ranking the best-matching food identities.
   Each object MUST have exactly two keys:
     "label"      - the candidate slug or normalized food name.
     "confidence" - a float between 0.0 and 1.0.
5. Return at most 5 candidates, ordered by descending confidence.
6. Return ONLY the JSON array — no markdown fences, no commentary.\
"""

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
        logger.warning("OpenRouter returned unparseable payload: %.200s", raw)
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


class OpenRouterVisionProvider:
    """Calls the OpenRouter REST API to match a food image against library slugs."""

    name = "openrouter"

    def __init__(self, api_key: str, *, model: str = _DEFAULT_MODEL, timeout: float = 60.0) -> None:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY must be set to use OpenRouterVisionProvider")
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
        
        if not labels:
            return []

        mime_type = _guess_mime(filename)
        encoded = base64.b64encode(image).decode("ascii")
        data_url = f"data:{mime_type};base64,{encoded}"

        payload = {
            "model": self._model,
            "messages": [
                {
                    "role": "system",
                    "content": _SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"Candidate slugs:\n{json.dumps(labels)}"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": data_url
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://nutrisense.local", # Optional but often required/good practice for OpenRouter
            "X-Title": "NutriSense"
        }

        try:
            resp = httpx.post(_ENDPOINT, json=payload, headers=headers, timeout=self._timeout)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            _safe = str(exc).replace(self._api_key, "REDACTED")
            logger.error("OpenRouter HTTP error: %s", _safe)
            code = "vision_auth_error" if exc.response.status_code in (401, 403) else "vision_provider_error"
            raise VisionProviderError(f"OpenRouter API failure: {_safe}", code=code) from None
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            logger.error("OpenRouter network error: %s", exc)
            raise VisionProviderError(f"OpenRouter network failure: {exc}") from None

        try:
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            logger.warning("Unexpected OpenRouter response structure")
            raise VisionProviderError("Malformed response from OpenRouter API") from None

        return _parse(raw_text, frozenset(labels))
