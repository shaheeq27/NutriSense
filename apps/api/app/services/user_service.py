from sqlalchemy.orm import Session

from app.core import clock
from app.core.exceptions import Unauthorized
from app.models.user import User, UserProfile
from app.repositories.user_repo import UserRepository
from app.schemas.user import ProfileIn, ProfileOut, ProfileWithTargets, UserMe, UserUpdate
from app.services import nutrition_service


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_active(self, user_id: int) -> User:
        user = self.repo.get(user_id)
        if not user:
            raise Unauthorized("User no longer exists")
        return user

    def me(self, user: User) -> UserMe:
        out = UserMe.model_validate(user)
        if user.profile:
            out.targets = nutrition_service.targets_for_profile(user.profile)
        return out

    def update(self, user: User, data: UserUpdate) -> UserMe:
        if data.name is not None:
            user.name = data.name.strip()
        self.repo.save(user)
        return self.me(user)

    def upsert_profile(self, user: User, data: ProfileIn) -> ProfileWithTargets:
        fields = data.model_dump(exclude={"age"})
        if data.birth_year is None and data.age is not None:
            fields["birth_year"] = clock.today().year - data.age
        fields["allergies"] = sorted({a.strip().lower() for a in data.allergies if a.strip()})
        profile = user.profile or UserProfile(user_id=user.id)
        for k, v in fields.items():
            setattr(profile, k, v)
        user.profile = profile
        self.repo.save(user)
        try:
            from datetime import timedelta

            from app.services.meal_planning_service import MealPlanningService, window
            w_start, w_end = window()
            planner = MealPlanningService(self.db)
            d = w_start
            while d <= w_end:
                day = planner.repo.get_day(user.id, d)
                if day is None or not any(m.eaten for m in day.meals):
                    planner._generate(user, d)
                d += timedelta(days=1)
        except Exception:
            pass
        return ProfileWithTargets(
            profile=ProfileOut.model_validate(profile), targets=nutrition_service.targets_for_profile(profile)
        )
