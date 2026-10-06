"""Meal plan generation, swaps and custom items, constrained to a rolling planning window."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import clock
from app.core.exceptions import BusinessRuleViolation, NotFound
from app.models.meal import MealPlanDay, MealTemplate, PlannedMeal
from app.models.user import User
from app.repositories.meal_plan_repo import MealPlanRepository
from app.schemas.common import SLOTS
from app.schemas.meal_plan import MealOption, MealPlanDayOut, MealPlanWindow, PlannedMealOut
from app.services import nutrition_service
from app.services.food_service import FoodService

PLANNING_WINDOW_DAYS = 3  # today + next 2 days
SLOT_SHARE = {"breakfast": 0.25, "lunch": 0.35, "snack": 0.10, "dinner": 0.30}
DIET_RANK = {"vegan": 0, "vegetarian": 1, "eggetarian": 2, "any": 3}
SERVING_STEPS = (0.75, 1.0, 1.25, 1.5)


def window(today: date | None = None) -> tuple[date, date]:
    start = today or clock.today()
    return start, start + timedelta(days=PLANNING_WINDOW_DAYS - 1)


def ensure_in_window(d: date) -> None:
    start, end = window()
    if d < start:
        raise BusinessRuleViolation(
            "Past days can't be planned - review them in Progress.", code="planning_window_exceeded"
        )
    if d > end:
        raise BusinessRuleViolation(
            f"You can plan up to {PLANNING_WINDOW_DAYS} days ahead (until {end.isoformat()}).",
            code="planning_window_exceeded",
        )


def ensure_slot(slot: str) -> None:
    if slot not in SLOTS:
        raise BusinessRuleViolation(f"Unknown slot '{slot}'", code="invalid_slot")


def normalize_allergen(a: str) -> str:
    s = a.strip().lower()
    if s in ("peanut", "peanuts", "peanut butter"):
        return "peanut"
    if s in ("egg", "eggs", "egg white", "egg whites"):
        return "egg"
    if s in ("dairy", "milk", "lactose", "curd", "cheese", "paneer", "yogurt", "yoghurt", "butter"):
        return "dairy"
    if s in ("gluten", "wheat", "flour", "roti"):
        return "gluten"
    if s in ("soy", "soya", "soybean", "soybeans", "tofu"):
        return "soy"
    if s in ("fish", "seafood", "salmon", "tuna"):
        return "fish"
    if s in ("shellfish", "prawn", "prawns", "shrimp", "shrimps", "crab", "lobster"):
        return "shellfish"
    if s in ("tree nut", "tree nuts", "nut", "nuts", "almond", "almonds", "cashew", "cashews", "walnut", "walnuts"):
        return "nut"
    if s.endswith("s") and len(s) > 3:
        return s[:-1]
    return s


def extract_allergens(allergies: list[str] | None) -> set[str]:
    if not allergies:
        return set()
    result = set()
    for item in allergies:
        if not item:
            continue
        for part in str(item).split(","):
            part = part.strip()
            if part:
                result.add(normalize_allergen(part))
    return result


def template_allowed(t: MealTemplate, diet_style: str, allergies: list[str]) -> bool:
    if DIET_RANK.get(t.diet, 3) > DIET_RANK.get(diet_style, 3):
        return False
    blocked = extract_allergens(allergies)
    template_allergens = extract_allergens(t.allergens or [])
    return not bool(blocked & template_allergens)


def pick_servings(template_kcal: float, slot_kcal: float) -> float:
    ratio = slot_kcal / template_kcal if template_kcal else 1
    return min(SERVING_STEPS, key=lambda s: abs(s - ratio))


def choose_template(options: list[MealTemplate], slot_kcal: float, seed: int) -> MealTemplate:
    """Closest-to-target templates; rotate between the two best by date for day-to-day variety."""
    ranked = sorted(options, key=lambda t: (abs(t.kcal - slot_kcal), t.id))
    top = ranked[: min(2, len(ranked))]
    return top[seed % len(top)]


def planned_from_template(t: MealTemplate, slot: str, servings: float = 1.0) -> PlannedMeal:
    return PlannedMeal(
        slot=slot, name=t.name, kcal=round(t.kcal * servings), protein=round(t.protein * servings, 1),
        carbs=round(t.carbs * servings, 1), fat=round(t.fat * servings, 1), servings=servings,
        template_id=t.id, custom=False, eaten=False,
    )


class MealPlanningService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = MealPlanRepository(db)
        self.foods = FoodService(db)

    # ------------------------------------------------------------ helpers
    def _prefs(self, user: User) -> tuple[str, list[str]]:
        p = user.profile
        return (p.diet_style, list(p.allergies or [])) if p else ("any", [])

    def _allowed(self, user: User, slot: str) -> list[MealTemplate]:
        diet, allergies = self._prefs(user)
        return [t for t in self.repo.templates(slot) if template_allowed(t, diet, allergies)]

    def _to_out(self, user: User, day: MealPlanDay) -> MealPlanDayOut:
        order = {s: i for i, s in enumerate(SLOTS)}
        meals = sorted(day.meals, key=lambda m: (order.get(m.slot, 9), m.id))
        return MealPlanDayOut(
            date=day.date,
            meals=[PlannedMealOut.model_validate(m) for m in meals],
            total_kcal=round(sum(m.kcal for m in meals)),
            target_kcal=nutrition_service.targets_for_profile(user.profile).kcal,
        )

    def _day_or_create(self, user: User, d: date) -> MealPlanDay:
        day = self.repo.get_day(user.id, d)
        if day is None:
            if user.profile is not None:
                return self._generate(user, d)
            day = MealPlanDay(user_id=user.id, date=d)
            self.db.add(day)
            try:
                self.db.commit()
                self.db.refresh(day)
            except IntegrityError:
                self.db.rollback()
                day = self.repo.get_day(user.id, d)
                if day is None:
                    raise
        return day

    def _generate(self, user: User, d: date) -> MealPlanDay:
        target = nutrition_service.targets_for_profile(user.profile).kcal
        meals: list[PlannedMeal] = []
        for i, slot in enumerate(SLOTS):
            options = self._allowed(user, slot)
            if not options:
                diet, _ = self._prefs(user)
                options = [t for t in self.repo.templates(slot) if DIET_RANK.get(t.diet, 3) <= DIET_RANK.get(diet, 3)]
                if not options:
                    options = self.repo.templates(slot)
            if not options:
                continue
            slot_kcal = target * SLOT_SHARE[slot]
            t = choose_template(options, slot_kcal, d.toordinal() + i)
            meals.append(planned_from_template(t, slot, pick_servings(t.kcal, slot_kcal)))
        return self.repo.replace_day(user.id, d, meals)

    # ------------------------------------------------------------ use cases
    def get_window(self, user: User, start: date | None = None) -> MealPlanWindow:
        w_start, w_end = window()
        start = start or w_start
        ensure_in_window(start)
        days, d = [], start
        while d <= w_end:
            days.append(self._to_out(user, self._day_or_create(user, d)))
            d += timedelta(days=1)
        return MealPlanWindow(days=days, window_start=w_start, window_end=w_end)

    def get_day(self, user: User, d: date) -> MealPlanDayOut:
        ensure_in_window(d)
        return self._to_out(user, self._day_or_create(user, d))

    def generate(self, user: User, d: date) -> MealPlanDayOut:
        ensure_in_window(d)
        return self._to_out(user, self._generate(user, d))

    def swap_options(self, user: User, d: date, slot: str) -> list[MealOption]:
        ensure_in_window(d)
        ensure_slot(slot)
        day = self._day_or_create(user, d)
        current = next((m for m in day.meals if m.slot == slot and not m.custom), None)
        ref_kcal = current.kcal if current else nutrition_service.targets_for_profile(user.profile).kcal * SLOT_SHARE[slot]
        opts = [t for t in self._allowed(user, slot) if not current or t.id != current.template_id]
        opts.sort(key=lambda t: abs(t.kcal - ref_kcal))
        return [MealOption.model_validate(t) for t in opts]

    def swap(self, user: User, d: date, slot: str, template_id: int) -> MealPlanDayOut:
        ensure_in_window(d)
        ensure_slot(slot)
        t = self.repo.get_template(template_id)
        if t is None:
            raise NotFound(f"Meal template {template_id} not found", code="template_not_found")
        if t.slot != slot:
            raise BusinessRuleViolation(f"Template is for {t.slot}, not {slot}", code="slot_mismatch")
        diet, allergies = self._prefs(user)
        if not template_allowed(t, diet, allergies):
            raise BusinessRuleViolation("This meal doesn't fit your diet or allergies", code="diet_conflict")
        day = self._day_or_create(user, d)
        for m in [m for m in day.meals if m.slot == slot and not m.custom]:
            day.meals.remove(m)
        day.meals.append(planned_from_template(t, slot))
        self.repo.commit()
        return self._to_out(user, day)

    def add_item(self, user: User, d: date, slot: str, food_id: int | None = None, slug: str | None = None, servings: float = 1.0, portion_grams: float | None = None) -> MealPlanDayOut:
        ensure_in_window(d)
        ensure_slot(slot)
        food = self.foods.resolve_target(food_id=food_id, slug=slug)
        facts = nutrition_service.scale(food, servings, portion_grams)
        day = self._day_or_create(user, d)
        self.repo.add_meal(
            day,
            PlannedMeal(
                slot=slot, name=food.name, food_id=food.id, slug=food.slug, kcal=facts.kcal, protein=facts.protein, carbs=facts.carbs,
                fat=facts.fat, servings=facts.servings, template_id=None, custom=True, eaten=False,
            ),
        )
        return self._to_out(user, day)

    def remove_item(self, user: User, d: date, slot: str, item_id: int) -> MealPlanDayOut:
        ensure_in_window(d)
        ensure_slot(slot)
        day = self._day_or_create(user, d)
        meal = next((m for m in day.meals if m.id == item_id and m.slot == slot), None)
        if meal is None:
            raise NotFound("Planned meal not found in this slot", code="meal_not_found")
        day.meals.remove(meal)
        self.repo.commit()
        return self._to_out(user, day)
