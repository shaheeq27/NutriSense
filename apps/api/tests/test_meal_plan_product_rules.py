"""Tests for meal plan product rules: no auto-template injection, strict separation from tracking."""
from datetime import timedelta

from app.services.meal_planning_service import MealPlanningService
from app.services.tracking_service import TrackingService


def test_empty_date_returns_no_planned_meals(db, user, fixed_clock):
    """GET meal plan for a date with nothing explicitly planned must return zero meals."""
    svc = MealPlanningService(db)
    w = svc.get_window(user)
    for day in w.days:
        assert day.meals == [], f"Date {day.date} should have no meals, got {len(day.meals)}"


def test_get_day_empty_returns_no_meals(db, user, fixed_clock):
    """get_day for a date with nothing explicitly planned must return zero meals."""
    svc = MealPlanningService(db)
    day = svc.get_day(user, fixed_clock)
    assert day.meals == []
    assert day.total_kcal == 0


from app.schemas.tracking import LogCreate

def test_tracking_does_not_create_planned_meal(db, user, fixed_clock):
    """Logging a food through tracking must NOT cause it to appear in the meal plan."""
    tracking = TrackingService(db)
    planning = MealPlanningService(db)

    # Log a food for today via tracking
    tracking.log(user, LogCreate(food_id=1, slot="breakfast", date=fixed_clock, servings=1))

    # Verify tracking has it
    summary = tracking.summary(user)
    breakfast_entries = [e for s in summary.slots if s.slot == "breakfast" for e in s.entries]
    assert len(breakfast_entries) == 1

    # Verify meal plan does NOT have it
    plan_day = planning.get_day(user, fixed_clock)
    assert plan_day.meals == [], "Tracked food must not appear in the meal plan"


def test_planning_does_not_create_tracking_record(db, user, fixed_clock):
    """Planning a food must NOT cause it to appear in today's tracking summary."""
    tracking = TrackingService(db)
    planning = MealPlanningService(db)

    # Plan a food for today via meal planning
    planning.add_item(user, fixed_clock, "lunch", food_id=1, servings=1)

    # Verify plan has it
    plan_day = planning.get_day(user, fixed_clock)
    lunch = [m for m in plan_day.meals if m.slot == "lunch"]
    assert len(lunch) == 1

    # Verify tracking does NOT have it
    summary = tracking.summary(user)
    lunch_entries = [e for s in summary.slots if s.slot == "lunch" for e in s.entries]
    assert len(lunch_entries) == 0, "Planned food must not appear in tracking"


def test_explicit_plan_appears_in_correct_date_slot(db, user, fixed_clock):
    """An explicitly planned item must appear in the correct date and slot."""
    svc = MealPlanningService(db)
    tomorrow = fixed_clock + timedelta(days=1)

    day = svc.add_item(user, tomorrow, "breakfast", food_id=1, servings=1)
    breakfast = [m for m in day.meals if m.slot == "breakfast"]
    assert len(breakfast) == 1
    assert breakfast[0].custom is True
    assert breakfast[0].name == "Chicken Biryani"


def test_planning_tomorrow_does_not_appear_today(db, user, fixed_clock):
    """Planning a meal for tomorrow must not make it appear in today's plan."""
    svc = MealPlanningService(db)
    tomorrow = fixed_clock + timedelta(days=1)

    svc.add_item(user, tomorrow, "breakfast", food_id=1, servings=1)

    today = svc.get_day(user, fixed_clock)
    assert today.meals == [], "Tomorrow's plan must not leak into today"


def test_planning_today_does_not_appear_tomorrow(db, user, fixed_clock):
    """Planning a meal for today must not make it appear in tomorrow's plan."""
    svc = MealPlanningService(db)
    tomorrow = fixed_clock + timedelta(days=1)

    svc.add_item(user, fixed_clock, "lunch", food_id=1, servings=1)

    tmrw = svc.get_day(user, tomorrow)
    assert tmrw.meals == [], "Today's plan must not leak into tomorrow"


def test_different_dates_remain_independent(db, user, fixed_clock):
    """Each date's meal plan is fully independent of other dates."""
    svc = MealPlanningService(db)
    today = fixed_clock
    tomorrow = fixed_clock + timedelta(days=1)
    day_after = fixed_clock + timedelta(days=2)

    svc.add_item(user, today, "breakfast", food_id=1, servings=1)
    svc.add_item(user, tomorrow, "lunch", food_id=1, servings=2)

    today_plan = svc.get_day(user, today)
    tomorrow_plan = svc.get_day(user, tomorrow)
    day_after_plan = svc.get_day(user, day_after)

    # Today has only breakfast
    assert len(today_plan.meals) == 1
    assert today_plan.meals[0].slot == "breakfast"

    # Tomorrow has only lunch
    assert len(tomorrow_plan.meals) == 1
    assert tomorrow_plan.meals[0].slot == "lunch"

    # Day after has nothing
    assert day_after_plan.meals == []


def test_window_returns_only_explicit_items(db, user, fixed_clock):
    """get_window must return only explicitly planned items, not templates."""
    svc = MealPlanningService(db)
    tomorrow = fixed_clock + timedelta(days=1)

    # Plan exactly one item
    svc.add_item(user, tomorrow, "dinner", food_id=1, servings=1)

    w = svc.get_window(user)
    assert len(w.days) == 3

    # Today: empty
    assert w.days[0].meals == []

    # Tomorrow: exactly the one dinner item
    assert len(w.days[1].meals) == 1
    assert w.days[1].meals[0].slot == "dinner"
    assert w.days[1].meals[0].custom is True

    # Day after: empty
    assert w.days[2].meals == []


import pytest
from app.core.exceptions import NotFound
from app.models.user import User

def test_deleting_planned_meal(db, user, fixed_clock):
    """Removing a planned meal completely deletes it."""
    svc = MealPlanningService(db)
    day = svc.add_item(user, fixed_clock, "breakfast", food_id=1, servings=1)
    meal_id = day.meals[0].id
    
    # Delete it
    updated_day = svc.remove_item(user, fixed_clock, "breakfast", meal_id)
    assert len(updated_day.meals) == 0

    # Ensure it's gone
    plan = svc.get_day(user, fixed_clock)
    assert len(plan.meals) == 0

def test_deleting_tracking_log(db, user, fixed_clock):
    """Removing a tracking log completely deletes it."""
    tracking = TrackingService(db)
    log_entry = tracking.log(user, LogCreate(food_id=1, slot="lunch", date=fixed_clock, servings=1))
    
    # Delete it
    tracking.delete(user, log_entry.id)
    
    # Ensure it's gone
    summary = tracking.summary(user)
    lunch_entries = [e for s in summary.slots if s.slot == "lunch" for e in s.entries]
    assert len(lunch_entries) == 0

def test_ownership_protection_planned_meal(db, user, fixed_clock):
    """Cannot delete another user's planned meal."""
    svc = MealPlanningService(db)
    day = svc.add_item(user, fixed_clock, "snack", food_id=1, servings=1)
    meal_id = day.meals[0].id
    
    other_user = User(id=999, email="hacker@example.com")
    with pytest.raises(NotFound):
        svc.remove_item(other_user, fixed_clock, "snack", meal_id)

def test_ownership_protection_tracking_log(db, user, fixed_clock):
    """Cannot delete another user's tracking log."""
    tracking = TrackingService(db)
    log_entry = tracking.log(user, LogCreate(food_id=1, slot="dinner", date=fixed_clock, servings=1))
    
    other_user = User(id=999, email="hacker@example.com")
    with pytest.raises(NotFound):
        tracking.delete(other_user, log_entry.id)
