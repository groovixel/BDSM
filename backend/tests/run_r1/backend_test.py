"""Regression coverage for the public inquiry and stay-booking APIs."""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
RUN_PREFIX = "TEST_r1_"


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def payload(stay=None, offset=0):
    start = date(2099, 11, 1) + timedelta(days=offset)
    return {
        "stay": stay or f"{RUN_PREFIX}stay_{uuid.uuid4().hex[:8]}",
        "name": "R1 Tester",
        "email": "r1.tester@example.com",
        "check_in": start.isoformat(),
        "check_out": (start + timedelta(days=2)).isoformat(),
        "guests": 2,
        "message": "Regression test booking",
    }


class TestCoreApi:
    """Health, inquiry persistence, and booking validation/API flows."""

    def test_root_health(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/", timeout=30)
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}

    def test_inquiry_create_persists_and_email_path_does_not_crash(self, api_client):
        email = f"r1-{uuid.uuid4().hex[:10]}@example.com"
        body = {
            "name": "R1 Inquiry",
            "email": email,
            "company": "R1 Studio",
            "message": "Please send a project consultation response.",
        }
        created = api_client.post(f"{BASE_URL}/api/inquiries", json=body, timeout=45)
        assert created.status_code == 201
        data = created.json()
        assert data["name"] == body["name"]
        assert data["email"] == email
        assert isinstance(data["id"], str) and data["id"]

        listed = api_client.get(f"{BASE_URL}/api/inquiries?limit=200", timeout=30)
        assert listed.status_code == 200
        matching = [row for row in listed.json() if row.get("id") == data["id"]]
        assert matching and matching[0]["message"] == body["message"]

    def test_booking_create_has_requested_status(self, api_client):
        body = payload()
        response = api_client.post(f"{BASE_URL}/api/bookings", json=body, timeout=45)
        assert response.status_code == 201
        data = response.json()
        assert data["stay"] == body["stay"]
        assert data["status"] == "requested"
        assert isinstance(data["id"], str) and data["id"]

    def test_booking_validation_rejects_non_positive_range(self, api_client):
        body = payload()
        body["check_out"] = body["check_in"]
        response = api_client.post(f"{BASE_URL}/api/bookings", json=body, timeout=30)
        assert response.status_code == 422
        assert "after" in response.text.lower()

    def test_booking_validation_rejects_bad_date_format(self, api_client):
        body = payload()
        body["check_in"] = "2099-1-01"
        response = api_client.post(f"{BASE_URL}/api/bookings", json=body, timeout=30)
        assert response.status_code == 422

    def test_availability_filter_returns_requested_booking(self, api_client):
        body = payload(stay=f"{RUN_PREFIX}availability_{uuid.uuid4().hex[:8]}", offset=10)
        created = api_client.post(f"{BASE_URL}/api/bookings", json=body, timeout=45)
        assert created.status_code == 201
        response = api_client.get(
            f"{BASE_URL}/api/stays/availability", params={"stay": body["stay"]}, timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["booked"] == []
        assert any(row["stay"] == body["stay"] and row["check_in"] == body["check_in"] for row in data["requested"])

    def test_booking_status_and_confirmed_overlap_protection(self, api_client):
        stay = f"{RUN_PREFIX}overlap_{uuid.uuid4().hex[:8]}"
        first_body = payload(stay=stay, offset=20)
        first = api_client.post(f"{BASE_URL}/api/bookings", json=first_body, timeout=45)
        assert first.status_code == 201
        booking_id = first.json()["id"]

        confirmed = api_client.post(
            f"{BASE_URL}/api/bookings/{booking_id}/status",
            json={"status": "confirmed"},
            timeout=30,
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "confirmed"

        overlap = api_client.post(f"{BASE_URL}/api/bookings", json=payload(stay=stay, offset=21), timeout=30)
        assert overlap.status_code == 409

    def test_booking_status_rejects_invalid_and_unknown_ids(self, api_client):
        body = payload(stay=f"{RUN_PREFIX}status_{uuid.uuid4().hex[:8]}", offset=30)
        created = api_client.post(f"{BASE_URL}/api/bookings", json=body, timeout=45)
        assert created.status_code == 201
        booking_id = created.json()["id"]

        invalid = api_client.post(
            f"{BASE_URL}/api/bookings/{booking_id}/status",
            json={"status": "approved"},
            timeout=30,
        )
        assert invalid.status_code == 422

        unknown = api_client.post(
            f"{BASE_URL}/api/bookings/{uuid.uuid4()}/status",
            json={"status": "confirmed"},
            timeout=30,
        )
        assert unknown.status_code == 404
