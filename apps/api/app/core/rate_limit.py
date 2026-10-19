import time
from typing import Dict, List, Tuple
from fastapi import Request
from app.core.config import settings
from app.core.exceptions import RateLimitExceededError

class SlidingWindowLimiter:
    def __init__(self):
        # In-memory store: key -> list of timestamps
        self._history: Dict[str, List[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        
        timestamps = self._history.get(key, [])
        # Filter timestamps within current window
        valid_timestamps = [t for t in timestamps if t > cutoff]
        
        if len(valid_timestamps) >= max_requests:
            oldest = valid_timestamps[0]
            retry_after = int(window_seconds - (now - oldest)) + 1
            return False, max(retry_after, 1)
        
        valid_timestamps.append(now)
        self._history[key] = valid_timestamps
        return True, 0

limiter = SlidingWindowLimiter()

async def rate_limit_check(
    request: Request,
    max_requests: int = 60,
    window_seconds: int = 60,
    key_prefix: str = "ip"
):
    # Use client IP or auth user if available
    client_ip = request.client.host if request.client else "127.0.0.1"
    key = f"{key_prefix}:{client_ip}"
    
    allowed, retry_after = limiter.is_allowed(key, max_requests, window_seconds)
    if not allowed:
        raise RateLimitExceededError(retry_after_seconds=retry_after)
