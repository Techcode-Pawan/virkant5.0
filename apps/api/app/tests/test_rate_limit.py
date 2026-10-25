from app.core.rate_limit import SlidingWindowLimiter


async def test_chat_request_succeeds_under_limit(client):
    headers = {"Authorization": "Bearer mock-operator:user-rate:org-rate"}
    resp = await client.post("/api/v1/chat", json={"message": "Quick test", "language": "en"}, headers=headers)
    assert resp.status_code == 200


def test_sliding_window_blocks_after_limit():
    limiter = SlidingWindowLimiter()
    assert all(limiter.is_allowed("k", 3, 60)[0] for _ in range(3))
    allowed, retry_after = limiter.is_allowed("k", 3, 60)
    assert allowed is False and retry_after >= 1
