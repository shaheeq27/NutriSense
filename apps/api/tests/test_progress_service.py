from datetime import timedelta
from app.schemas.tracking import LogCreate
from app.services.progress_service import ProgressService
from app.services.tracking_service import TrackingService


def test_progress_empty_logs(db, user):
    res = ProgressService(db).get(user, "7d")
    assert res.range == "7d"
    assert len(res.days) == 7
    assert len(res.points) == 7
    assert res.days_logged == 0
    assert res.total_meals_logged == 0
    assert res.top_slot is None
    assert res.avg_kcal == 0
    assert res.avg_protein == 0
    assert res.current_streak == 0
    assert res.best_streak == 0
    assert res.lifetime_logged_days == 0
    assert res.shields_available == 1


def test_progress_with_logged_meals(db, user, fixed_clock):
    svc = TrackingService(db)
    svc.log(user, LogCreate(slot="breakfast", food_id=1, servings=1))
    svc.log(user, LogCreate(slot="lunch", custom={"name": "Salad", "kcal": 200, "protein": 10}))
    
    prog = ProgressService(db).get(user, "7d")
    assert prog.days_logged == 1
    assert prog.total_meals_logged == 2
    assert prog.top_slot in ["breakfast", "lunch"]
    assert prog.avg_kcal == 680 + 200
    assert prog.current_streak == 1
    assert prog.streak_days == 1
    assert prog.best_streak == 1
    assert prog.lifetime_logged_days == 1
    assert prog.shields_available == 1
    assert prog.averages is not None
    assert prog.averages.kcal == 880
