from app.schemas.food import FoodOut
from app.schemas.nutrition import CalculateRequest
from app.services import nutrition_service as ns

EGG = FoodOut(id=1, slug="boiled-egg", name="Boiled Egg", tag="Eggs", unit="egg", kcal=78, protein=6, carbs=0.6,
              fat=5, fiber=0, sugar=0.6, sodium=62)


def test_scale_by_servings_and_daily_values():
    f = ns.scale(EGG, 2)
    assert (f.kcal, f.protein, f.fat, f.sodium, f.servings) == (156, 12, 10, 124, 2)
    assert f.daily_values["protein"] == 24  # 12 / 50 g
    assert f.daily_values["kcal"] == 8


def test_estimator_single_category():
    e = ns.estimate_food("mango smoothie")
    assert e.estimated and e.id is None
    assert e.kcal == 140 and "Beverage" in e.tag


def test_estimator_averages_multiple_categories():
    e = ns.estimate_food("chicken fried rice")
    # protein (420) + fried (420) + main (480) averaged
    assert e.kcal == round((420 + 420 + 480) / 3)
    assert e.protein == round((32 + 9 + 14) / 3, 1)


def test_estimator_whole_word_matching():
    # "pineapple" must not trigger "apple"(fruit) via substring; "donut" must not trigger "nut"
    assert ns.matched_profiles("pineapple pastry")[0]["tag"] == "Dessert"
    assert len(ns.matched_profiles("pineapple pastry")) == 1
    assert ns.matched_profiles("donut") == []
    # plural is still matched
    assert ns.matched_profiles("noodles")[0]["tag"] == "Main course"


def test_estimator_leading_quantity():
    e = ns.estimate_food("3 kebabs")
    assert e.kcal == 420 * 3
    assert e.unit.startswith("3 ×")
    assert e.name == "Kebabs"


def test_split_quantity():
    assert ns.split_quantity("2 eggs") == (2, "eggs")
    assert ns.split_quantity("half mango") == (0.5, "mango")
    assert ns.split_quantity("idli") == (1, "idli")
    assert ns.split_quantity("500 rice") == (1, "rice")  # out of range clamps to 1


def test_targets_mifflin_st_jeor():
    t = ns.compute_targets(ns.TargetInput(sex="male", weight_kg=70, height_cm=175, age=30,
                                          activity_level="moderate", goal="maintain"))
    assert t.bmr == round(10 * 70 + 6.25 * 175 - 5 * 30 + 5)  # 1649
    assert t.tdee == round(1648.75 * 1.55)
    assert t.kcal == t.tdee
    assert t.protein == 84
    lose = ns.compute_targets(ns.TargetInput(sex="male", weight_kg=70, height_cm=175, age=30, goal="lose"))
    assert lose.kcal == t.kcal - 500


def test_parse_with_lookup(db):
    from app.services.food_service import FoodService

    r = ns.parse_meal_text("2 eggs and 2 rotis, a zorblax", FoodService(db).best_match)
    names = [i.food.name for i in r.items]
    assert names[0] == "Boiled Egg" and names[1] == "Roti"
    assert r.items[2].food.estimated
    assert r.totals.kcal == 156 + 200 + r.items[2].nutrition.kcal


APPLE_100G = FoodOut(
    id=2, slug="apple-100g", name="Apple", tag="Fruit", unit="100 g",
    kcal=52, protein=0.3, carbs=13.8, fat=0.2, fiber=2.4, sugar=10.4, sodium=1
)


def test_scale_by_portion_grams():
    f = ns.scale(APPLE_100G, servings=1, portion_grams=150)
    assert f.kcal == 78  # 52 * 1.5
    assert f.protein == ns._r(APPLE_100G.protein * 1.5)
    assert f.servings == 1.5
    assert f.portion_grams == 150
    assert f.unit == "100 g"

def test_portion_grams_overrides_servings_only_when_not_both_supplied():
    # portion based
    f1 = ns.scale(APPLE_100G, servings=5, portion_grams=150)
    assert f1.servings == 1.5
    
    # legacy servings
    f2 = ns.scale(APPLE_100G, servings=2)
    assert f2.servings == 2
    assert f2.portion_grams is None
    assert f2.kcal == 104

def test_reject_both_servings_and_portion_grams():
    import pytest
    from pydantic import ValidationError
    
    with pytest.raises(ValidationError):
        CalculateRequest(food_id=1, servings=2, portion_grams=150)
        
    # Implicit default serving is allowed
    req = CalculateRequest(food_id=1, portion_grams=150)
    assert req.portion_grams == 150
    assert req.servings == 1

def test_reject_invalid_portion_grams():
    import pytest
    from pydantic import ValidationError
    
    with pytest.raises(ValidationError):
        CalculateRequest(food_id=1, portion_grams=0)
        
    with pytest.raises(ValidationError):
        CalculateRequest(food_id=1, portion_grams=-10)

def test_portion_grams_preserves_daily_values():
    f = ns.scale(APPLE_100G, portion_grams=200) # factor 2
    assert f.kcal == 104
    # 104 / 2000 * 100 = 5%
    assert f.daily_values["kcal"] == 5
    # protein = 0.6 / 50 * 100 = 1%
    assert f.daily_values["protein"] == 1
