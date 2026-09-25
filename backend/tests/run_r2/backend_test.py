"""Run r2 regression coverage for public inquiry, booking, availability, and status APIs."""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
RUN_PREFIX = f"TEST_r2_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


def payload(suffix: str, **overrides):
    today = date.today()
    value = {
        "stay": f"{RUN_PREFIX}_{suffix}",
        "name": f"{RUN_PREFIX} Guest",
        "email": f"{RUN_PREFIX.lower()}_{suffix.lower()}@example.com",
        "check_in": (today + timedelta(days=40)).isoformat(),
        "check_out": (today + timedelta(days=43)).isoformat(),
        "guests": 2,
    }
    value.update(overrides)
    return value


@pytest.fixture(scope="module")
def created_booking_ids(client):
    ids = []
    yield ids
    for booking_id in ids:
        client.delete(f"{BASE_URL}/api/bookings/{booking_id}")


class TestCoreEndpoints:
    def test_root(self, client):
        response = client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}

    def test_create_inquiry_persists_and_email_path_does_not_crash(self, client):
        request = {
            "name": f"{RUN_PREFIX} Inquiry",
            "email": f"{RUN_PREFIX.lower()}@example.com",
            "company": "Regression Studio",
            "agency": "Interior Designing",
            "budget": "₹10L–₹25L",
            "message": f"{RUN_PREFIX} inquiry persistence check",
        }
        created = client.post(f"{BASE_URL}/api/inquiries", json=request)
        assert created.status_code == 201
        data = created.json()
        assert data["name"] == request["name"]
        assert data["email"] == request["email"]
        assert isinstance(data["id"], str) and data["id"]

        listed = client.get(f"{BASE_URL}/api/inquiries?limit=200")
        assert listed.status_code == 200
        matches = [item for item in listed.json() if item.get("id") == data["id"]]
        assert len(matches) == 1
        assert matches[0]["message"] == request["message"]

    def test_inquiry_validation(self, client):
        response = client.post(
            f"{BASE_URL}/api/inquiries",
            json={"name": "", "email": "not-an-email", "message": "x"},
        )
        assert response.status_code == 422

    def test_availability_shape_and_filter(self, client):
        response = client.get(f"{BASE_URL}/api/stays/availability")
        assert response.status_code == 200
        data = response.json()
        assert set(data) == {"booked", "requested"}
        assert isinstance(data["booked"], list)
        assert isinstance(data["requested"], list)

        filtered = client.get(f"{BASE_URL}/api/stays/availability", params={"stay": f"{RUN_PREFIX}_none"})
        assert filtered.status_code == 200
        assert filtered.json() == {"booked": [], "requested": []}


class TestBookings:
    def test_create_booking_requested_and_persists(self, client, created_booking_ids):
        request = payload("primary")
        response = client.post(f"{BASE_URL}/api/bookings", json=request)
        assert response.status_code == 201
        data = response.json()
        created_booking_ids.append(data["id"])
        assert data["stay"] == request["stay"]
        assert data["check_in"] == request["check_in"]
        assert data["check_out"] == request["check_out"]
        assert data["guests"] == 2
        assert data["status"] == "requested"

        listed = client.get(f"{BASE_URL}/api/bookings?limit=200")
        assert listed.status_code == 200
        match = next(item for item in listed.json() if item["id"] == data["id"])
        assert match["email"] == request["email"]
        assert "_id" not in match

    @pytest.mark.parametrize(
        "changes",
        [
            {"check_out": (date.today() + timedelta(days=40)).isoformat()},
            {"check_in": "03/01/2027"},
            {"check_out": "2027-99-99"},
        ],
    )
    def test_booking_date_validation(self, client, changes):
        request = payload("invalid", **changes)
        response = client.post(f"{BASE_URL}/api/bookings", json=request)
        assert response.status_code == 422

    def test_status_flow_and_overlap_rejection(self, client, created_booking_ids):
        primary = payload("confirmed", check_in="2035-06-10", check_out="2035-06-13")
        created = client.post(f"{BASE_URL}/api/bookings", json=primary)
        assert created.status_code == 201
        primary_id = created.json()["id"]
        created_booking_ids.append(primary_id)

        confirmed = client.post(
            f"{BASE_URL}/api/bookings/{primary_id}/status",
            json={"status": "confirmed"},
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "confirmed"

        availability = client.get(
            f"{BASE_URL}/api/stays/availability", params={"stay": primary["stay"]}
        )
        assert availability.status_code == 200
        assert any(item.get("check_in") == primary["check_in"] for item in availability.json()["booked"])

        overlapping = payload(
            "overlap",
            stay=primary["stay"],
            check_in="2035-06-12",
            check_out="2035-06-15",
        )
        rejected = client.post(f"{BASE_URL}/api/bookings", json=overlapping)
        assert rejected.status_code == 409

    def test_invalid_and_unknown_status_updates(self, client):
        invalid = client.post(
            f"{BASE_URL}/api/bookings/{RUN_PREFIX}_missing/status",
            json={"status": "approved"},
        )
        assert invalid.status_code == 422

        unknown = client.post(
            f"{BASE_URL}/api/bookings/{RUN_PREFIX}_missing/status",
            json={"status": "cancelled"},
        )
        assert unknown.status_code == 404
