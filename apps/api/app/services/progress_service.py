"""Progress aggregates over 7/30/90 days, computed from food logs."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core import clock
from app.models.user import User
from app.repositories.tracking_repo import TrackingRepository
from app.schemas.progress import DailyPoint, ProgressAverages, ProgressRange, ProgressResponse
from app.services import nutrition_service

RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}
ON_TARGET_TOLERANCE = 0.10  # within ±10% of kcal target


class ProgressService:
    def __init__(self, db: Session):
        self.repo = TrackingRepository(db)

    def get(self, user: User, rng: ProgressRange = "7d") -> ProgressResponse:
        n = RANGE_DAYS[rng]
        end = clock.today()
        start = end - timedelta(days=n - 1)
        targets = nutrition_service.targets_for_profile(user.profile)
        kcal: dict = defaultdict(float)
        protein: dict = defaultdict(float)
        slots_count: dict = defaultdict(int)
        logs = self.repo.for_range(user.id, start, end)
        for log in logs:
            kcal[log.date] += log.kcal
            protein[log.date] += log.protein
            if log.slot:
                slots_count[log.slot.lower()] += 1
        days = []
        for i in range(n):
            d = start + timedelta(days=i)
            logged = d in kcal
            on = logged and abs(kcal[d] - targets.kcal) <= targets.kcal * ON_TARGET_TOLERANCE
            days.append(DailyPoint(date=d, kcal=round(kcal.get(d, 0)), protein=round(protein.get(d, 0), 1),
                                   logged=logged, on_target=on))
        logged_days = [p for p in days if p.logged]
        all_dates = self.repo.distinct_dates(user.id)
        # Streak of consecutive logged days ending today (or yesterday, if today isn't logged yet).
        today = clock.today()
        curr = today
        if curr not in all_dates:
            curr = today - timedelta(days=1)
        streak = 0
        while curr in all_dates:
            streak += 1
            curr -= timedelta(days=1)

        # Best streak calculation across all time
        sorted_dates = sorted(all_dates)
        best = 0
        cur_run = 0
        prev_d = None
        for d in sorted_dates:
            if prev_d and d == prev_d + timedelta(days=1):
                cur_run += 1
            else:
                cur_run = 1
            prev_d = d
            if cur_run > best:
                best = cur_run

        nl = len(logged_days)
        avg_kcal = round(sum(p.kcal for p in logged_days) / nl) if nl else 0
        avg_protein = round(sum(p.protein for p in logged_days) / nl, 1) if nl else 0
        top_slot = max(slots_count, key=slots_count.get) if slots_count else None
        return ProgressResponse(
            range=rng, start=start, end=end, days=days,
            points=days,
            avg_kcal=avg_kcal,
            avg_protein=avg_protein,
            averages=ProgressAverages(kcal=avg_kcal, protein=avg_protein),
            days_logged=nl,
            total_meals_logged=len(logs),
            top_slot=top_slot,
            adherence_pct=round(sum(p.on_target for p in days) / n * 100, 1),
            current_streak=streak,
            streak_days=streak,
            best_streak=best,
            lifetime_logged_days=len(all_dates),
            shields_available=1,
            target_kcal=targets.kcal, target_protein=targets.protein,
        )
