import logging
import math

import httpx

from app.core.exceptions import DomainError
from app.schemas.food import FoodOut

log = logging.getLogger(__name__)

class OFFProviderError(DomainError):
    """Network or API error when fetching from Open Food Facts."""
    status_code = 502
    code = "off_provider_error"

def _handle_off_error(exc: Exception) -> None:
    log.error("Open Food Facts API error: %s", exc)
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        if status in (401, 403):
            raise OFFProviderError(f"Open Food Facts Auth/Forbidden: {exc}", code="off_auth_error") from exc
        if status == 429:
            raise OFFProviderError(f"Open Food Facts Rate Limit: {exc}", code="off_rate_limit") from exc
    raise OFFProviderError(f"Open Food Facts Network/API failure: {exc}") from exc

def _extract_nutrients(nutriments: dict) -> dict[str, float] | None:
    def _get_core(key: str) -> float | None:
        val = nutriments.get(f"{key}_100g")
        if val is None:
            return None
        try:
            f_val = float(val)
            if not math.isfinite(f_val):
                return None
            return f_val
        except (ValueError, TypeError):
            return None

    kcal = _get_core("energy-kcal")
    protein = _get_core("proteins")
    carbs = _get_core("carbohydrates")
    fat = _get_core("fat")

    if None in (kcal, protein, carbs, fat):
        return None

    def _get_optional(key: str) -> float:
        val = nutriments.get(f"{key}_100g")
        if val is None:
            return 0.0
        try:
            f_val = float(val)
            if not math.isfinite(f_val):
                return 0.0
            return f_val
        except (ValueError, TypeError):
            return 0.0

    sodium_g = _get_optional("sodium")
    sodium_mg = round(sodium_g * 1000)

    return {
        "kcal": kcal,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "fiber": _get_optional("fiber"),
        "sugar": _get_optional("sugars"),
        "sodium": sodium_mg
    }

class OpenFoodFactsProvider:
    name = "openfoodfacts"

    def __init__(self, client: httpx.Client | None = None, timeout: float = 10.0):
        headers = {"User-Agent": "NutriSense/1.0 - local/test implementation"}
        self.client = client or httpx.Client(timeout=timeout, headers=headers)

    def candidates(self, query: str) -> list[FoodOut]:
        if not query:
            return []
            
        try:
            r = self.client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
                    "page_size": 20,
                },
            )
            r.raise_for_status()
        except httpx.HTTPError as e:
            _handle_off_error(e)
            
        out: list[FoodOut] = []
        data = r.json()
        products = data.get("products", [])
        for p in products:
            p_name = p.get("product_name")
            if not p_name:
                continue
                
            nutriments = p.get("nutriments")
            if not nutriments:
                continue
                
            vals = _extract_nutrients(nutriments)
            if vals is None:
                continue

            db_id = p.get("_id", "unknown")
            brands = p.get("brands", "").split(",")
            brand = brands[0].strip() if brands and brands[0].strip() else "Packaged Food"
            name = str(p_name).strip()
            
            out.append(
                FoodOut(
                    id=None,
                    slug=f"off-{db_id}",
                    name=name,
                    tag=brand,
                    unit="100 g",
                    source="openfoodfacts",
                    **vals
                )
            )
        return out

    def get_by_barcode(self, barcode: str) -> FoodOut | None:
        if not barcode:
            return None
            
        try:
            r = self.client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            )
            if r.status_code == 404:
                return None
            r.raise_for_status()
        except httpx.HTTPError as e:
            _handle_off_error(e)
            
        data = r.json()
        status = data.get("status")
        if status != 1:
            return None
            
        p = data.get("product", {})
        p_name = p.get("product_name")
        if not p_name:
            return None
            
        nutriments = p.get("nutriments")
        if not nutriments:
            return None
            
        vals = _extract_nutrients(nutriments)
        if vals is None:
            return None
            
        db_id = p.get("_id", barcode)
        brands = p.get("brands", "").split(",")
        brand = brands[0].strip() if brands and brands[0].strip() else "Packaged Food"
        name = str(p_name).strip()
        
        return FoodOut(
            id=None,
            slug=f"off-{db_id}",
            name=name,
            tag=brand,
            unit="100 g",
            source="openfoodfacts",
            **vals
        )
