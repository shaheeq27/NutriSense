"""Domain errors. Services raise these; main.py maps them to HTTP responses."""


class DomainError(Exception):
    status_code = 400
    code = "domain_error"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class NotFound(DomainError):
    status_code = 404
    code = "not_found"


class Conflict(DomainError):
    status_code = 409
    code = "conflict"


class BusinessRuleViolation(DomainError):
    status_code = 422
    code = "business_rule_violation"


class Unauthorized(DomainError):
    status_code = 401
    code = "unauthorized"


class AIProviderError(DomainError):
    status_code = 502
    code = "ai_provider_error"

