from fastapi import APIRouter, Response, status

from app.api.deps import DB, CurrentUser
from app.schemas.tracking import DailySummary, LogCreate, LogOut
from app.services.tracking_service import TrackingService

router = APIRouter(prefix="/tracking", tags=["tracking"])


@router.post("/logs", response_model=LogOut, status_code=status.HTTP_201_CREATED)
def create_log(body: LogCreate, user: CurrentUser, db: DB):
    return TrackingService(db).log(user, body)


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, user: CurrentUser, db: DB):
    TrackingService(db).delete(user, log_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/today", response_model=DailySummary)
def today(user: CurrentUser, db: DB):
    return TrackingService(db).summary(user)
