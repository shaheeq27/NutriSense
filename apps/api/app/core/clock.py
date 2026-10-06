"""Clock abstraction so date-based business rules are testable.

Services call `clock.today()` / `clock.now()`; tests swap the implementation with `set_clock`.
"""

from collections.abc import Callable
from datetime import date, datetime
from zoneinfo import ZoneInfo
from app.core.config import get_settings

def _default_now() -> datetime:
    tz = ZoneInfo(get_settings().APP_TIMEZONE)
    return datetime.now(tz)

_now: Callable[[], datetime] = _default_now

def now() -> datetime:
    return _now()

def today() -> date:
    return _now().date()

def set_clock(fn: Callable[[], datetime]) -> None:
    global _now
    _now = fn

def reset_clock() -> None:
    set_clock(_default_now)
