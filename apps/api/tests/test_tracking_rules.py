from datetime import UTC, timedelta

import pytest

from app.core.exceptions import BusinessRuleViolation
from app.schemas.tracking import LogCreate
from app.services.meal_planning_service import MealPlanningService
from app.services.tracking_service import TrackingService


def test_log_today_ok(db, user):
    log = TrackingService(db).log(user, LogCreate(slot="lunch", food_id=1, servings=2))
    assert log.kcal == 2 * 680


@pytest.mark.parametrize("offset", [1, -1])
def test_log_other_day_rejected(db, user, fixed_clock, offset):
    with pytest.raises(BusinessRuleViolation) as e:
        TrackingService(db).log(user, LogCreate(slot="lunch", food_id=1, date=fixed_clock + timedelta(days=offset)))
    assert e.value.code == "logging_not_allowed_for_date"


def test_planned_meal_marked_eaten_and_reverted(db, user, fixed_clock):
    day = MealPlanningService(db).generate(user, fixed_clock)
    pm = day.meals[0]
    svc = TrackingService(db)
    log = svc.log(user, LogCreate(slot=pm.slot, planned_meal_id=pm.id))
    assert MealPlanningService(db).get_day(user, fixed_clock).meals[0].eaten
    svc.delete(user, log.id)
    assert not MealPlanningService(db).get_day(user, fixed_clock).meals[0].eaten


def test_future_planned_meal_cannot_be_logged(db, user, fixed_clock):
    day = MealPlanningService(db).generate(user, fixed_clock + timedelta(days=1))
    with pytest.raises(BusinessRuleViolation):
        TrackingService(db).log(user, LogCreate(slot="lunch", planned_meal_id=day.meals[0].id))

def test_timezone_boundary_handling(db, user):
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    from app.core import clock
    
    # 2026-10-03 21:16:00 UTC is 2026-10-04 02:46:00 in Asia/Kolkata
    boundary_utc = datetime(2026, 10, 3, 21, 16, 0, tzinfo=UTC)
    
    # Mock clock to return the local time in Asia/Kolkata
    clock.set_clock(lambda: boundary_utc.astimezone(ZoneInfo("Asia/Kolkata")))
    
    try:
        assert clock.today().day == 4
        
        # Should succeed for local today (Oct 4)
        log_today = TrackingService(db).log(user, LogCreate(slot="breakfast", food_id=1, date=clock.today()))
        assert log_today.date.day == 4
        
        # Should fail for UTC today (Oct 3) because locally it is now in the past
        with pytest.raises(BusinessRuleViolation) as e:
            TrackingService(db).log(user, LogCreate(slot="breakfast", food_id=1, date=clock.today() - timedelta(days=1)))
        assert e.value.code == "logging_not_allowed_for_date"
        
        # Should fail for Oct 5
        with pytest.raises(BusinessRuleViolation) as e:
            TrackingService(db).log(user, LogCreate(slot="breakfast", food_id=1, date=clock.today() + timedelta(days=1)))
        assert e.value.code == "logging_not_allowed_for_date"
    finally:
        clock.reset_clock()
