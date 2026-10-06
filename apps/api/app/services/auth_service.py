from sqlalchemy.orm import Session

from app.core.exceptions import Conflict, Unauthorized
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserOut


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def _token(self, user: User) -> TokenResponse:
        return TokenResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))

    def register(self, email: str, password: str, name: str) -> TokenResponse:
        email = email.lower()
        if self.users.get_by_email(email):
            raise Conflict("An account with this email already exists", code="email_taken")
        user = self.users.add(User(email=email, name=name.strip(), password_hash=hash_password(password)))
        return self._token(user)

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise Unauthorized("Incorrect email or password", code="invalid_credentials")
        return self._token(user)
