"""Nutrition math: scaling, %DV, targets (Mifflin-St Jeor), keyword estimator and NL parsing."""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass

from app.core import clock
from app.schemas.food import FoodOut
from app.schemas.nutrition import NutritionFacts, ParsedItem, ParseResponse, Targets, Totals
from app.services.text import norm, slugify, stem

# FDA reference daily values (adult, 2,000 kcal diet). Sodium in mg.
DAILY_VALUES = {"kcal": 2000, "protein": 50, "carbs": 275, "fat": 78, "fiber": 28, "sugar": 50, "sodium": 2300}
NUTRIENTS = ("kcal", "protein", "carbs", "fat", "fiber", "sugar", "sodium")
MAX_QTY = 20

# ---------------------------------------------------------------- scaling


def _r(x: float) -> float:
    return round(x, 1)


def scale(food: FoodOut, servings: float = 1.0, portion_grams: float | None = None) -> NutritionFacts:
    if portion_grams is not None:
        factor = portion_grams / 100.0
        used_servings = factor
    else:
        factor = servings
        used_servings = servings
        
    vals = {n: getattr(food, n) * factor for n in NUTRIENTS}
    return NutritionFacts(
        kcal=round(vals["kcal"]),
        protein=_r(vals["protein"]), carbs=_r(vals["carbs"]), fat=_r(vals["fat"]),
        fiber=_r(vals["fiber"]), sugar=_r(vals["sugar"]), sodium=round(vals["sodium"]),
        servings=used_servings, unit=food.unit,
        portion_grams=portion_grams,
        daily_values=daily_values(vals),
    )


def daily_values(vals: dict[str, float]) -> dict[str, float]:
    return {n: round(vals.get(n, 0) / dv * 100) for n, dv in DAILY_VALUES.items()}


def totals(facts: list[NutritionFacts]) -> Totals:
    t = {n: sum(getattr(f, n) for f in facts) for n in NUTRIENTS}
    return Totals(**{n: (round(v) if n in ("kcal", "sodium") else _r(v)) for n, v in t.items()})


# ---------------------------------------------------------------- targets

ACTIVITY_FACTORS = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "active": 1.725, "very_active": 1.9}
GOAL_KCAL_DELTA = {"lose": -500, "maintain": 0, "gain": 300}
PROTEIN_G_PER_KG = {"lose": 1.6, "maintain": 1.2, "gain": 1.8}
SEX_CONSTANT = {"male": 5, "female": -161, "other": -78}
DEFAULT_AGE = 30
MIN_KCAL = 1200
# Used before onboarding (matches the prototype's TARGET).
DEFAULT_TARGETS = Targets(kcal=2100, protein=110, carbs=250, fat=70, fiber=29, bmr=0, tdee=2100)


@dataclass(frozen=True)
class TargetInput:
    sex: str
    weight_kg: float
    height_cm: float
    age: int
    activity_level: str = "moderate"
    goal: str = "maintain"


def age_from_birth_year(birth_year: int | None) -> int:
    return clock.today().year - birth_year if birth_year else DEFAULT_AGE


def compute_targets(p: TargetInput) -> Targets:
    bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + SEX_CONSTANT.get(p.sex, -78)
    tdee = bmr * ACTIVITY_FACTORS.get(p.activity_level, 1.55)
    kcal = max(MIN_KCAL, tdee + GOAL_KCAL_DELTA.get(p.goal, 0))
    protein = p.weight_kg * PROTEIN_G_PER_KG.get(p.goal, 1.2)
    fat = kcal * 0.28 / 9
    carbs = max(0.0, (kcal - protein * 4 - fat * 9) / 4)
    return Targets(
        kcal=round(kcal), protein=round(protein), carbs=round(carbs), fat=round(fat),
        fiber=round(kcal / 1000 * 14), bmr=round(bmr), tdee=round(tdee),
    )


def targets_for_profile(profile) -> Targets:
    """`profile` is a UserProfile ORM object or None."""
    if profile is None:
        return DEFAULT_TARGETS
    return compute_targets(
        TargetInput(
            sex=profile.sex, weight_kg=profile.weight_kg, height_cm=profile.height_cm,
            age=age_from_birth_year(profile.birth_year), activity_level=profile.activity_level,
            goal=profile.goal,
        )
    )


# ---------------------------------------------------------------- estimator
# Ported from foods.ts PROFILES. Fixes vs prototype:
#  * whole-word (and plural-stemmed) matching - "pineapple" no longer matches "apple", "donut" no "nut"
#  * when several categories match ("chicken fried rice") their profiles are averaged, not first-wins
#  * leading quantity ("2 samosas") scales the result

_PROFILES: list[tuple[set[str], dict]] = [
    ({"juice", "soda", "drink", "shake", "smoothie", "tea", "coffee", "lassi", "milk"},
     dict(tag="Beverage", unit="glass", kcal=140, protein=3, carbs=26, fat=3, fiber=0.5, sugar=22, sodium=60, emoji="🥤")),
    ({"salad", "greens", "veg", "veggie", "vegetable", "sabzi", "soup"},
     dict(tag="Light meal", unit="bowl", kcal=220, protein=7, carbs=22, fat=11, fiber=5, sugar=6, sodium=520, emoji="🥗")),
    ({"cake", "sweet", "dessert", "halwa", "kheer", "pastry", "brownie", "candy", "pie", "ladoo", "laddu",
      "barfi", "jalebi"},
     dict(tag="Dessert", unit="serving", kcal=360, protein=5, carbs=50, fat=16, fiber=1, sugar=34, sodium=180, emoji="🍰")),
    ({"fried", "fry", "pakora", "bhaji", "tikki", "cutlet", "crispy", "kachori"},
     dict(tag="Fried", unit="serving", kcal=420, protein=9, carbs=40, fat=25, fiber=3, sugar=3, sodium=640, emoji="🍤")),
    ({"chicken", "mutton", "beef", "pork", "lamb", "fish", "prawn", "shrimp", "egg", "meat", "kebab", "kabab"},
     dict(tag="Protein dish", unit="serving", kcal=420, protein=32, carbs=14, fat=26, fiber=1, sugar=3, sodium=760, emoji="🍗")),
    ({"rice", "pulao", "noodle", "pasta", "bread", "roti", "paratha", "wrap", "sandwich", "burger", "pizza"},
     dict(tag="Main course", unit="serving", kcal=480, protein=14, carbs=66, fat=17, fiber=4, sugar=5, sodium=820, emoji="🍽️")),
    ({"fruit", "berry", "berri", "melon", "apple", "pear", "plum", "peach", "cherry", "cherri", "guava", "kiwi"},
     dict(tag="Fruit", unit="cup", kcal=80, protein=1, carbs=20, fat=0.3, fiber=3, sugar=15, sodium=2, emoji="🍑")),
    ({"nut", "seed", "trail", "chip", "crisp", "snack", "namkeen", "bhujia"},
     dict(tag="Snack", unit="handful", kcal=180, protein=5, carbs=14, fat=12, fiber=2, sugar=2, sodium=200, emoji="🥜")),
]
_FALLBACK = dict(tag="Mixed dish", unit="serving", kcal=400, protein=15, carbs=45, fat=17, fiber=4, sugar=6, sodium=650,
                 emoji="🍽️")

_WORD_NUMBERS = {"a": 1, "an": 1, "one": 1, "half": 0.5, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
                 "seven": 7, "eight": 8, "nine": 9, "ten": 10}
_LEADING_QTY = re.compile(r"^\s*(\d+(?:\.\d+)?|\d+/\d+)\s*(?:x\s+)?(.*)$", re.I)


def split_quantity(text: str) -> tuple[float, str]:
    """'2 eggs' -> (2, 'eggs'); 'half mango' -> (0.5, 'mango'); 'idli' -> (1, 'idli'). Clamped to (0, 20]."""
    t = text.strip().lower()
    qty: float = 1
    m = _LEADING_QTY.match(t)
    if m:
        raw, t = m.group(1), m.group(2)
        if "/" in raw:
            a, b = raw.split("/")
            qty = float(a) / float(b) if float(b) else 1
        else:
            qty = float(raw)
    else:
        first, _, rest = t.partition(" ")
        if first in _WORD_NUMBERS and rest:
            qty, t = _WORD_NUMBERS[first], rest
    if not (0 < qty <= MAX_QTY):
        qty = 1
    return qty, t.strip()


def matched_profiles(text: str) -> list[dict]:
    words = norm(text).split()
    keys = set(words) | {stem(w) for w in words} | {w[:-1] for w in words if len(w) > 3 and w.endswith("s")}
    return [p for kw, p in _PROFILES if kw & keys]


def estimate_food(query: str) -> FoodOut:
    """Heuristic estimate so any food text returns a useful (clearly flagged) result."""
    qty, rest = split_quantity(norm(query))
    profiles = matched_profiles(rest)
    if not profiles:
        base, tag = _FALLBACK, _FALLBACK["tag"]
    elif len(profiles) == 1:
        base, tag = profiles[0], profiles[0]["tag"]
    else:
        base = {n: sum(p[n] for p in profiles) / len(profiles) for n in NUTRIENTS}
        units = {p["unit"] for p in profiles}
        base.update(unit=units.pop() if len(units) == 1 else "serving", emoji=profiles[0]["emoji"])
        tag = " + ".join(p["tag"] for p in profiles)
    name = rest.title() or "Your food"
    unit = base["unit"] if qty == 1 else f"{qty:g} × {base['unit']}"
    return FoodOut(
        id=None, slug=f"est-{slugify(rest) or 'food'}", name=name, tag=f"{tag} • Estimate", unit=unit,
        kcal=round(base["kcal"] * qty), protein=_r(base["protein"] * qty), carbs=_r(base["carbs"] * qty),
        fat=_r(base["fat"] * qty), fiber=_r(base["fiber"] * qty), sugar=_r(base["sugar"] * qty),
        sodium=round(base["sodium"] * qty), emoji=base["emoji"], source="estimate", estimated=True,
    )


# ---------------------------------------------------------------- natural language

_SPLIT = re.compile(r"\s*(?:,|;|\+|&|\band\b|\bwith\b|\bplus\b)\s*", re.I)


def parse_meal_text(text: str, lookup: Callable[[str], FoodOut | None]) -> ParseResponse:
    """'2 eggs and 2 rotis' -> items + totals. `lookup(name)` returns a confident library match or None."""
    items: list[ParsedItem] = []
    for chunk in filter(None, (c.strip() for c in _SPLIT.split(text))):
        qty, name = split_quantity(chunk)
        if not norm(name):
            continue
        food = lookup(name)
        if food is None:
            food = estimate_food(name)  # per single serving, quantity applied below
        items.append(ParsedItem(food=food, quantity=qty, nutrition=scale(food, qty)))
    return ParseResponse(items=items, totals=totals([i.nutrition for i in items]))
