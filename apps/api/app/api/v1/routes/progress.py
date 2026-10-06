from fastapi import APIRouter, Query

from app.api.deps import DB, CurrentUser
from app.schemas.progress import ProgressRange, ProgressResponse
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("", response_model=ProgressResponse)
def progress(user: CurrentUser, db: DB, range: ProgressRange = Query("7d")):  # noqa: A002
    return ProgressService(db).get(user, range)
