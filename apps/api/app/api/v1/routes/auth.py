from fastapi import APIRouter, status

from app.api.deps import DB
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DB):
    return AuthService(db).register(body.email, body.password, body.name)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DB):
    return AuthService(db).login(body.email, body.password)
