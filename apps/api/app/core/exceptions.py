from typing import Any, Optional
from fastapi import HTTPException, status

class ForgeWiseException(HTTPException):
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Any] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": message,
                "details": details or {}
            }
        )

class AuthenticationError(ForgeWiseException):
    def __init__(self, message: str = "Invalid or expired authentication credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_FAILED",
            message=message
        )

class AuthorizationError(ForgeWiseException):
    def __init__(self, message: str = "Insufficient permissions for requested industrial asset"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN_OPERATION",
            message=message
        )

class TenantIsolationError(ForgeWiseException):
    def __init__(self, message: str = "Cross-tenant access violation detected"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="CROSS_TENANT_ACCESS_DENIED",
            message=message
        )

class DocumentValidationError(ForgeWiseException):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_DOCUMENT",
            message=message,
            details=details
        )

class InvalidInputError(ForgeWiseException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_INPUT",
            message=message
        )

class NotFoundError(ForgeWiseException):
    def __init__(self, message: str = "Requested resource was not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            message=message
        )

class DatabaseUnavailableError(ForgeWiseException):
    def __init__(self, message: str = "The database is currently unreachable. Please retry shortly."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="DATABASE_UNAVAILABLE",
            message=message
        )

class LLMUnavailableError(ForgeWiseException):
    def __init__(self, message: str, attempts: Optional[list] = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="LLM_UNAVAILABLE",
            message=message,
            details={"attempts": attempts or []}
        )

class RateLimitExceededError(ForgeWiseException):
    def __init__(self, retry_after_seconds: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message=f"Rate limit exceeded. Please retry in {retry_after_seconds} seconds.",
            details={"retry_after_seconds": retry_after_seconds}
        )
