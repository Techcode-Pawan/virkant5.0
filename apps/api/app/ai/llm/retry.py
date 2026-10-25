import asyncio
import random
import time
from typing import Awaitable, Callable, Tuple, TypeVar

from app.ai.llm.errors import ProviderError

T = TypeVar("T")


def backoff_delay(attempt: int, base: float, cap: float) -> float:
    """Exponential backoff with full jitter: uniform(0, min(cap, base * 2**attempt))."""
    return random.uniform(0, min(cap, base * (2 ** attempt)))


async def retry_async(
    fn: Callable[[], Awaitable[T]],
    *,
    max_retries: int,
    base_delay: float,
    max_delay: float,
    deadline: float,
) -> Tuple[T, int]:
    """
    Runs fn, retrying only retryable ProviderErrors, at most max_retries extra
    times and never past `deadline` (time.monotonic()). Returns (result, retries).
    The raised error carries `.retries` so callers can report what happened.
    """
    attempt = 0
    while True:
        try:
            return await fn(), attempt
        except ProviderError as err:
            err.retries = attempt
            if not err.retryable or attempt >= max_retries:
                raise
            delay = backoff_delay(attempt, base_delay, max_delay)
            if err.retry_after:
                delay = max(delay, min(err.retry_after, max_delay))
            if time.monotonic() + delay >= deadline:
                raise
            await asyncio.sleep(delay)
            attempt += 1
