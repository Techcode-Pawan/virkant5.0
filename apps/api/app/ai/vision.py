"""Optional image/schematic description during ingestion (VISION_PROVIDER)."""
import base64

from app.ai.http_client import get_http_client
from app.ai.llm.service import llm_service
from app.core.config import settings
from app.core.logging import app_logger

DEFAULT_PROMPT = (
    "Transcribe the visible text and describe this industrial diagram: component tags, "
    "values with units, connections and any safety warnings. Do not guess unreadable values."
)


async def describe_image(image_bytes: bytes, mime_type: str, prompt: str = DEFAULT_PROMPT) -> str:
    """Returns a description, or "" when no vision provider is configured or the call fails."""
    provider = settings.VISION_PROVIDER
    if provider in ("", "none"):
        return ""
    key = llm_service.api_key("anthropic" if provider in ("anthropic", "claude") else provider)
    if not key:
        return ""
    b64 = base64.b64encode(image_bytes).decode("ascii")
    client = get_http_client()
    try:
        if provider == "gemini":
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                headers={"x-goog-api-key": key},
                json={"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": mime_type, "data": b64}}]}]},
                timeout=60,
            )
            resp.raise_for_status()
            parts = resp.json()["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts).strip()
        if provider == "openai":
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": [{"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                    ]}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            return (resp.json()["choices"][0]["message"].get("content") or "").strip()
        if provider in ("anthropic", "claude"):
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                json={
                    "model": settings.ANTHROPIC_MODEL,
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": b64}},
                        {"type": "text", "text": prompt},
                    ]}],
                },
                timeout=60,
            )
            resp.raise_for_status()
            return "".join(b.get("text", "") for b in resp.json().get("content", [])).strip()
    except Exception as exc:
        app_logger.warning(f"Vision description failed ({provider}): {exc.__class__.__name__}")
    return ""
