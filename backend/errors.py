from typing import Any


class AppError(Exception):
    """Domain error rendered as {"error": {"code", "message", "details"}}."""

    def __init__(self, status_code: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status_code, self.code, self.message, self.details = status_code, code, message, details
