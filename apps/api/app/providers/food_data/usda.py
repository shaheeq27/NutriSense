"""USDA FoodData Central provider. Only used when FOOD_PROVIDER=usda and USDA_API_KEY is set.

Results are not persisted; their `id` is None and `source` is "usda". Values are per 100 g.
"""

import logging
import re

import httpx

from app.core.exceptions import DomainError
from app.schemas.food import FoodOut

log = logging.getLogger(__name__)

BASE_URL = "https://api.nal.usda.gov/fdc/v1"

# FDC nutrient numbers (mapping both SR Legacy and Foundation IDs to our model)
_N = {
    # SR Legacy
    "208": "kcal", "203": "protein", "205": "carbs", "204": "fat", "291": "fiber", "269": "sugar", "307": "sodium",
    # Foundation
    "1008": "kcal", "1003": "protein", "1005": "carbs", "1004": "fat", "1079": "fiber", "2000": "sugar", "1093": "sodium"
}

CURATED_RAW_FOODS: dict[str, int] = {
    "banana": 173944,
    "apple": 171688,
    "orange": 169097,
    "mango": 169910,
    "grapes": 174683,
    "watermelon": 167765,
    "pineapple": 169124,
    "tomato": 170457,
    "potato": 170026,
    "carrot": 170393,
    "onion": 170000,
    "broccoli": 170379,
    "spinach": 168462,
    "cucumber": 2709784,
    "corn": 169998,
    "rice": 169756,
    "oats": 169705,
    "egg": 171287,
    "milk": 171265,
    "yogurt": 171284,
    "eggplant": 169228,
    "brinjal": 169228,
}


class USDAProviderError(DomainError):
    """Network or API error when fetching from USDA."""
    status_code = 502
    code = "usda_provider_error"


def _handle_usda_error(exc: Exception, api_key: str) -> None:
    key_str = str(api_key) if api_key else ""
    _safe = str(exc).replace(key_str, "REDACTED") if key_str else str(exc)
    log.error("USDA API error: %s", _safe)
    
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        if status in (401, 403):
            raise USDAProviderError(f"USDA Authentication failed: {_safe}", code="usda_auth_error") from None
        if status == 429:
            raise USDAProviderError(f"USDA Rate Limit Exceeded: {_safe}", code="usda_rate_limit") from None
        
    raise USDAProviderError(f"USDA Network/API failure: {_safe}") from None


class UsdaFoodProvider:
    name = "usda"

    def __init__(self, api_key: str, client: httpx.Client | None = None, timeout: float = 5.0):
        self.api_key = api_key
        self.client = client or httpx.Client(base_url=BASE_URL, timeout=timeout)

    def candidates(self, query: str) -> list[FoodOut]:
        if not query:
            return []
            
        try:
            r = self.client.get(
                "/foods/search", params={"api_key": self.api_key, "query": query, "pageSize": 10}
            )
            r.raise_for_status()
        except httpx.HTTPError as e:
            _handle_usda_error(e, self.api_key)
            
        out: list[FoodOut] = []
        for item in r.json().get("foods", []):
            vals = {v: 0.0 for v in set(_N.values())}
            for n in item.get("foodNutrients", []):
                nut_id = str(n.get("nutrientNumber") or n.get("nutrientId") or (n.get("nutrient", {}).get("id") if isinstance(n.get("nutrient"), dict) else "") or "")
                key = _N.get(nut_id)
                if key:
                    vals[key] = float(n.get("value") or n.get("amount") or 0)
            raw_id = item.get("fdcId")
            fdc_id: int | None = None
            if raw_id is not None:
                try:
                    fdc_id = int(raw_id)
                except (ValueError, TypeError):
                    fdc_id = None
            cat = item.get("foodCategory")
            tag = cat.get("description", "USDA") if isinstance(cat, dict) else (cat or "USDA")
            out.append(
                FoodOut(
                    id=fdc_id,
                    slug=f"usda-{fdc_id}" if fdc_id is not None else f"usda-{raw_id}",
                    name=str(item.get("description", "")).title(),
                    tag=str(tag),
                    unit="100 g",
                    source="usda",
                    estimated=False,
                    **vals,
                )
            )
        return out

    def get(self, food_id: int) -> FoodOut | None:
        """Fetch exact food by FDC ID from USDA."""
        try:
            r = self.client.get(
                f"/food/{food_id}", params={"api_key": self.api_key}
            )
            if r.status_code == 404:
                return None
            r.raise_for_status()
        except httpx.HTTPError as e:
            _handle_usda_error(e, self.api_key)

        data = r.json()
        desc = data.get("description")
        if not desc:
            raise USDAProviderError("Malformed USDA response: missing description.")
            
        vals = {v: 0.0 for v in set(_N.values())}
        for n in data.get("foodNutrients", []):
            nut = n.get("nutrient", {})
            nut_id = str(nut.get("id") or n.get("nutrientNumber") or n.get("nutrientId") or "")
            key = _N.get(nut_id)
            if key:
                vals[key] = float(n.get("amount") or n.get("value") or 0)
                
        cat = data.get("foodCategory")
        tag = cat.get("description", "USDA") if isinstance(cat, dict) else (cat or "USDA")
                
        return FoodOut(
            id=food_id,
            slug=f"usda-{food_id}",
            name=str(desc).title(),
            tag=str(tag),
            unit="100 g",
            source="usda",
            estimated=False,
            **vals
        )

    def get_curated(self, slug: str) -> FoodOut | None:
        """Fetch exact curated raw food from FDC."""
        normalized = slug.strip().lower()
        if normalized.startswith("usda-"):
            try:
                fdc_id = int(normalized[5:])
                return self.get(fdc_id)
            except ValueError:
                return None
        fdc_id = CURATED_RAW_FOODS.get(normalized)
        if not fdc_id:
            return None
        return self.get(fdc_id)

    def get_curated_slugs(self) -> list[str]:
        return list(CURATED_RAW_FOODS.keys())

    def best_candidate(self, query: str) -> FoodOut | None:
        """Search and select the most authoritative basic/whole food matching the query."""
        if not query or not query.strip():
            return None
        items = self.candidates(query)
        return select_best_usda_candidate(query, items)


def select_best_usda_candidate(query: str, items: list[FoodOut]) -> FoodOut | None:
    """Select the best USDA candidate, prioritizing basic/raw foods over salads/processed products."""
    if not items or not query.strip():
        return None
        
    q = query.strip().lower()
    q_words = [w for w in re.findall(r"[a-z0-9]+", q) if len(w) > 1]
    if not q_words:
        return None
        
    q_singular = q.rstrip("s").rstrip("e")
    
    penalties = {
        "salad", "dressing", "oil", "muffin", "cake", "soup", "juice", 
        "sauce", "flavor", "pie", "cookie", "bread", "syrup", "chips", 
        "candy", "dip", "spread", "babyfood", "beverage", "seasoning", "mix"
    }

    def score(item: FoodOut) -> int:
        name = item.name.lower()
        parts = [p.strip() for p in name.split(",")]
        primary = parts[0]
        pts = 0
        
        # Exact match or standard USDA raw food convention: "Carrots, Raw", "Cucumber, Raw"
        if name in (q, f"{q}, raw", f"{q}s, raw", f"{q}es, raw", f"{q_singular}, raw", f"{q_singular}s, raw"):
            pts += 200
        elif primary in (q, f"{q}s", f"{q}es", q_singular, f"{q_singular}s"):
            pts += 100
            if "raw" in parts:
                pts += 50
        elif primary.startswith(q) or q in primary:
            pts += 50
            if "raw" in parts:
                pts += 25
        elif any(p in (q, f"{q}s", f"{q}es", q_singular, f"{q_singular}s") for p in parts):
            # Matches a USDA taxonomy subtype, e.g. "Squash, Summer, Zucchini, Raw"
            pts += 90
            if "raw" in parts:
                pts += 50
        elif any(q in p for p in parts):
            pts += 40
            if "raw" in parts:
                pts += 25
        elif any(w in primary for w in q_words):
            pts += 20
        elif any(any(w in p for w in q_words) for p in parts):
            pts += 10

        # Penalize dishes/processed variants if query did not specify them
        for word in penalties:
            if word in name and word not in q_words:
                pts -= 80

        return pts

    ranked = sorted(items, key=lambda it: (-score(it), len(it.name)))
    top = ranked[0]
    return top if score(top) > 0 else None
