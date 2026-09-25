import uuid

import httpx
import pytest


BASE_URL = "http://localhost:8001"


@pytest.mark.asyncio
async def test_inquiry_create_and_validate_over_http():
    suffix = uuid.uuid4().hex[:10]
    payload = {
        "name": f"tscheck-contact-{suffix}",
        "email": f"{suffix}@example.com",
        "company": "TS Check Studio",
        "agency": "Foxy Moron",
        "budget": "25L-1Cr",
        "message": "A valid project inquiry for the contact flow.",
    }
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        response = await client.post("/api/inquiries", json=payload)
        assert response.status_code == 201, response.text[:500]
        created = response.json()
        assert created["name"] == payload["name"]
        assert created["email"] == payload["email"]
        assert created["message"] == payload["message"]
        assert created.get("id")

        invalid = await client.post(
            "/api/inquiries",
            json={**payload, "email": "not-an-email", "message": "bad"},
        )
        assert invalid.status_code == 422, invalid.text[:500]
