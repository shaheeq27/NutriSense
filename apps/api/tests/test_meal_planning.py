from datetime import timedelta

import pytest

from app.core.exceptions import BusinessRuleViolation
from app.models.user import UserProfile
from app.services.meal_planning_service import PLANNING_WINDOW_DAYS, MealPlanningService


def test_window_allows_today_through_plus_two(db, user, fixed_clock):
    svc = MealPlanningService(db)
    for i in range(PLANNING_WINDOW_DAYS):
        day = svc.generate(user, fixed_clock + timedelta(days=i))
        assert {m.slot for m in day.meals} == {"breakfast", "lunch", "snack", "dinner"}


@pytest.mark.parametrize("offset", [-1, 3, 10])
def test_window_rejects_outside(db, user, fixed_clock, offset):
    with pytest.raises(BusinessRuleViolation) as e:
        MealPlanningService(db).generate(user, fixed_clock + timedelta(days=offset))
    assert e.value.code == "planning_window_exceeded"


def test_get_window_returns_three_days(db, user, fixed_clock):
    w = MealPlanningService(db).get_window(user)
    assert [d.date for d in w.days] == [fixed_clock + timedelta(days=i) for i in range(3)]


def test_vegan_profile_gets_only_vegan_meals(db, user, fixed_clock):
    db.add(UserProfile(user_id=user.id, sex="female", height_cm=160, weight_kg=55, diet_style="vegan",
                       allergies=["peanut"]))
    db.commit()
    db.refresh(user)
    svc = MealPlanningService(db)
    day = svc.generate(user, fixed_clock)
    from app.models.meal import MealTemplate
    for m in day.meals:
        t = db.get(MealTemplate, m.template_id)
        assert t.diet == "vegan" and "peanut" not in t.allergens


def test_swap_and_add_item(db, user, fixed_clock):
    svc = MealPlanningService(db)
    opts = svc.swap_options(user, fixed_clock, "lunch")
    day = svc.swap(user, fixed_clock, "lunch", opts[0].template_id)
    lunch = [m for m in day.meals if m.slot == "lunch"]
    assert len(lunch) == 1 and lunch[0].template_id == opts[0].template_id
    day = svc.add_item(user, fixed_clock, "snack", 1, 1)
    assert any(m.custom for m in day.meals if m.slot == "snack")

def test_meal_planning_add_item_portion_grams(db, user, fixed_clock):
    svc = MealPlanningService(db)
    # Add food_id 1 (assume it is available in local test DB) with portion_grams=150
    # Wait, the add_item signature is (user, d, slot, food_id, servings, portion_grams)
    day = svc.add_item(user, fixed_clock, "snack", 1, portion_grams=150)
    
    # Verify the database PlannedMeal stores the correctly scaled nutrient snapshot
    snack = [m for m in day.meals if m.slot == "snack" and m.custom]
    assert len(snack) == 1
    # food_id 1 is Chicken Biryani in test DB. base_kcal = 680, protein = 28
    # portion_grams = 150 -> factor 1.5. kcal = 680 * 1.5 = 1020.
    assert snack[0].servings == 1.5
    assert snack[0].kcal == 1020.0
    assert snack[0].protein == 42.0

def test_add_item_request_validation():
    from app.schemas.meal_plan import AddItemRequest
    from pydantic import ValidationError
    import pytest
    
    with pytest.raises(ValidationError):
        AddItemRequest(food_id=1, servings=2, portion_grams=150)
        
    req1 = AddItemRequest(food_id=1, portion_grams=150)
    assert req1.portion_grams == 150
    assert req1.servings == 1
    
    req2 = AddItemRequest(food_id=1, servings=2)
    assert req2.servings == 2
    assert req2.portion_grams is None


def test_allergen_normalization_plural_and_synonyms(db, user, fixed_clock):
    from app.models.meal import MealTemplate
    from app.services.meal_planning_service import template_allowed

    # Verify template_allowed directly
    poha = db.query(MealTemplate).filter(MealTemplate.name == "Poha + Peanuts").first()
    assert poha is not None
    # "Peanuts" plural must block "peanut" allergen
    assert not template_allowed(poha, "vegan", ["Peanuts"])
    assert not template_allowed(poha, "vegan", ["peanut"])
    assert not template_allowed(poha, "vegan", ["peanut butter"])

    paneer = db.query(MealTemplate).filter(MealTemplate.name == "Paneer Paratha + Curd").first()
    assert paneer is not None
    # "Milk" and "Dairy" must block "dairy"
    assert not template_allowed(paneer, "vegetarian", ["Milk"])
    assert not template_allowed(paneer, "vegetarian", ["Dairy"])
    # "Wheat" must block "gluten"
    assert not template_allowed(paneer, "vegetarian", ["Wheat"])

    # Verify generated plan excludes peanuts when user has plural "Peanuts"
    db.add(UserProfile(user_id=user.id, sex="female", height_cm=160, weight_kg=55, diet_style="vegetarian",
                       allergies=["Peanuts"]))
    db.commit()
    db.refresh(user)

    svc = MealPlanningService(db)
    day = svc.generate(user, fixed_clock)
    for m in day.meals:
        t = db.get(MealTemplate, m.template_id)
        if t:
            assert "peanut" not in (t.allergens or [])
            assert t.diet in ("vegan", "vegetarian")

