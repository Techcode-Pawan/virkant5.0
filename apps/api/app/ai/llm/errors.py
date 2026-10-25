"""Normalized provider errors so the fallback manager can decide what to do."""
import json
from typing import Optional

import httpx

# kind -> whether retrying the *same* model can help
RETRYABLE_KINDS = {"rate_limit", "timeout", "unavailable", "network"}


class ProviderError(Exception):
    def __init__(
        self,
        kind: str,
        message: str,
        *,
        retryable: Optional[bool] = None,
        status_code: Optional[int] = None,
        retry_after: Optional[float] = None,
    ):
        super().__init__(message)
        self.kind = kind
        self.message = message[:300]
        self.retryable = kind in RETRYABLE_KINDS if retryable is None else retryable
        self.status_code = status_code
        self.retry_after = retry_after
        self.retries = 0


def _retry_after(headers: httpx.Headers) -> Optional[float]:
    value = headers.get("retry-after")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        return None


def _error_text(response: httpx.Response) -> str:
    try:
        body = response.json()
    except (json.JSONDecodeError, ValueError):
        return response.text[:200]
    err = body.get("error") if isinstance(body, dict) else None
    if isinstance(err, dict):
        return str(err.get("message") or err.get("type") or err)[:200]
    if isinstance(err, str):
        return err[:200]
    return str(body)[:200]


def from_response(provider: str, response: httpx.Response) -> ProviderError:
    status = response.status_code
    detail = _error_text(response)
    label = f"{provider} returned HTTP {status}"
    if status in (401, 403):
        return ProviderError("auth", f"{label}: the API key was rejected. {detail}", status_code=status)
    if status == 404:
        return ProviderError("model_not_found", f"{label}: model or endpoint not found. {detail}", status_code=status)
    if status == 429:
        quota = "quota" in detail.lower() or "billing" in detail.lower()
        return ProviderError(
            "rate_limit",
            f"{label}: {'quota exhausted' if quota else 'rate limited'}. {detail}",
            retryable=not quota,
            status_code=status,
            retry_after=_retry_after(response.headers),
        )
    if status == 408:
        return ProviderError("timeout", f"{label}: request timed out.", status_code=status)
    if status >= 500:
        return ProviderError(
            "unavailable",
            f"{label}: service temporarily unavailable. {detail}",
            status_code=status,
            retry_after=_retry_after(response.headers),
        )
    return ProviderError("bad_request", f"{label}: {detail}", status_code=status)


def from_exception(provider: str, exc: BaseException) -> ProviderError:
    if isinstance(exc, ProviderError):
        return exc
    if isinstance(exc, httpx.TimeoutException):
        return ProviderError("timeout", f"{provider} did not respond before the timeout.")
    if isinstance(exc, (httpx.ConnectError, httpx.NetworkError, httpx.RemoteProtocolError)):
        return ProviderError("network", f"Could not connect to {provider}: {exc.__class__.__name__}.")
    if isinstance(exc, (KeyError, IndexError, TypeError, ValueError)):
        return ProviderError("invalid_response", f"{provider} returned an unexpected response format.", retryable=False)
    return ProviderError("unknown", f"{provider} request failed: {exc.__class__.__name__}.", retryable=False)
