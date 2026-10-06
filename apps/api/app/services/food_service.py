"""Food search (ranking ported from foods.ts searchFoods) and lookup."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import NotFound
from app.providers.food_data.local import LocalFoodProvider
from app.providers.food_data.usda import UsdaFoodProvider
from app.providers.food_data.openfoodfacts import OpenFoodFactsProvider
from app.schemas.food import FoodOut, FoodSearchResponse
from app.services import nutrition_service
from app.services.text import norm, stem

MAX_LIMIT = 50


@dataclass
class Scored:
    food: FoodOut
    score: int
    all_words_in_name: bool


def _query_words(q: str) -> list[str]:
    return [stem(w) for w in q.split(" ") if len(w) > 1 and not w.isdigit()]


def score_food(food: FoodOut, aliases: str, q: str, words: list[str]) -> Scored:
    name = norm(food.name)
    hay = norm(f"{food.name} {aliases} {food.tag}")
    name_stems = {stem(n) for n in name.split(" ")}
    alias_stems = {stem(a) for a in norm(aliases).split(" ") if a}
    score = 0
    if name == q or " ".join(stem(w) for w in name.split()) == " ".join(stem(w) for w in q.split()):
        score += 100
    if q in name:
        score += 40
    in_name = 0
    for w in words:
        if w in name_stems:
            score += 20
            in_name += 1
        elif w in alias_stems:
            score += 12
            in_name += 1
        elif w in hay:
            score += 8
    return Scored(food, score, bool(words) and in_name == len(words))


class FoodService:
    def __init__(self, db: Session):
        self.local = LocalFoodProvider(db)
        s = get_settings()
        api_key = s.USDA_API_KEY
        if not api_key and (s.FOOD_PROVIDER == "usda" or s.ENV != "test"):
            api_key = "DEMO_KEY"
        self.remote = (
            UsdaFoodProvider(api_key) if api_key else None
        )
        self.packaged_provider = (
            OpenFoodFactsProvider() if s.ENABLE_OPEN_FOOD_FACTS else None
        )

    def rank(self, query: str, limit: int = 10) -> list[Scored]:
        q = norm(query)
        foods = self.local.candidates(q)
        if not q:
            return [Scored(f, 0, False) for f in foods[:limit]]
        aliases = self.local.aliases()
        words = _query_words(q)
        scored = [score_food(f, aliases.get(f.id or 0, ""), q, words) for f in foods]
        scored = [s for s in scored if s.score > 0]
        scored.sort(key=lambda s: (-s.score, len(s.food.name)))
        return scored[:limit]

    def search(self, query: str, limit: int = 10) -> FoodSearchResponse:
        limit = max(1, min(limit, MAX_LIMIT))
        ranked = self.rank(query, limit)
        items = [s.food for s in ranked]
        
        usda_searched = False
        if not items and self.remote and norm(query):
            usda_searched = True
            usda_items = self.remote.candidates(query)
            if usda_items:
                items = usda_items[:limit]

        exact = bool(ranked) and ranked[0].all_words_in_name
        if usda_searched:
            estimate = None
        else:
            estimate = None if exact or not norm(query) else nutrition_service.estimate_food(query)

        return FoodSearchResponse(items=items, estimate=estimate)

    def best_match(self, name: str) -> FoodOut | None:
        """Confident single match for NL parsing: every query word appears in the name/aliases.
        Combo dishes whose name starts with a quantity (e.g. '2 Eggs + 2 Rotis') are skipped."""
        for s in self.rank(name, 10):
            if s.all_words_in_name and not s.food.name[:1].isdigit():
                return s.food
        return None

    def get(self, food_id: int) -> FoodOut:
        food = self.local.get(food_id)
        if food is None and self.remote:
            food = self.remote.get(food_id)
        if food is None:
            raise NotFound(f"Food {food_id} not found", code="food_not_found")
        return food

    def resolve_target(self, food_id: int | None = None, slug: str | None = None) -> FoodOut:
        if food_id is not None:
            return self.get(food_id)
        if slug:
            if slug.startswith("off-"):
                barcode = slug[4:]
                food = self.resolve_barcode(barcode)
                if food:
                    return food
            elif slug.startswith("usda-"):
                try:
                    fdc_id = int(slug[5:])
                    return self.get(fdc_id)
                except ValueError:
                    pass
            else:
                food = self.local.get_by_slug(slug)
                if food:
                    return food
                if self.remote:
                    food = self.remote.get_curated(slug)
                    if food:
                        return food
            raise NotFound(f"Food {slug} not found", code="food_not_found")
        raise ValueError("Must provide food_id or slug")

    def library(self) -> list[FoodOut]:
        return self.local.candidates("")
        
    def resolve_vision_slug(self, slug: str) -> FoodOut | None:
        """Resolve a vision guess label to a canonical food item."""
        if not slug:
            return None

        # 1. Check curated USDA foods first
        if self.remote:
            curated = self.remote.get_curated(slug)
            if curated:
                return curated

        # 2. Check local database catalog
        local = self.local.get_by_slug(slug)
        if local:
            return local

        # 3. Fall back to authoritative USDA search for uncataloged foods
        if self.remote:
            clean_name = slug.replace("-", " ").strip()
            return self.remote.best_candidate(clean_name)

        return None
        
    def supported_vision_slugs(self) -> list[str]:
        slugs = [f.slug for f in self.library()]
        if self.remote:
            slugs.extend(self.remote.get_curated_slugs())
        return list(set(slugs))

    def search_packaged_food(self, query: str) -> list[FoodOut]:
        """Search packaged foods via Open Food Facts."""
        if not self.packaged_provider or not query:
            return []
        return self.packaged_provider.candidates(query)
        
    def resolve_barcode(self, barcode: str) -> FoodOut | None:
        """Resolve a packaged food by barcode via Open Food Facts."""
        if not self.packaged_provider or not barcode:
            return None
        return self.packaged_provider.get_by_barcode(barcode)
