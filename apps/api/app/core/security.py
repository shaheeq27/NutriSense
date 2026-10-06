from datetime import timedelta

import bcrypt
import jwt

from app.core import clock
from app.core.config import get_settings
from app.core.exceptions import Unauthorized


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode())
    except ValueError:
        return False


def create_access_token(subject: str | int) -> str:
    s = get_settings()
    issued = clock.now()
    payload = {"sub": str(subject), "iat": issued, "exp": issued + timedelta(minutes=s.JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.JWT_SECRET, algorithms=[s.JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        raise Unauthorized("Invalid or expired token") from e
    sub = payload.get("sub")
    if not sub:
        raise Unauthorized("Invalid token payload")
    return sub
