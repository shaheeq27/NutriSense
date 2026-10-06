from fastapi import APIRouter

from app.api.deps import DB, CurrentUser
from app.schemas.user import ProfileIn, ProfileWithTargets, UserMe, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
def me(user: CurrentUser, db: DB):
    return UserService(db).me(user)


@router.patch("/me", response_model=UserMe)
def update_me(body: UserUpdate, user: CurrentUser, db: DB):
    return UserService(db).update(user, body)


@router.put("/me/profile", response_model=ProfileWithTargets)
def put_profile(body: ProfileIn, user: CurrentUser, db: DB):
    return UserService(db).upsert_profile(user, body)
