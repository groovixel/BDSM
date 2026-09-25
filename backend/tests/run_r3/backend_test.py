"""Regression tests for BDS Marvel health, inquiry, booking, availability, and status APIs."""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
RUN = uuid.uuid4().hex[:10]


@pytest.fixture(scope="module")
def api_client():
    client = requests.Session()
    client.headers.update({"Content-Type": "application/json"})
    return client


def booking_payload(stay, check_in, check_out, suffix=None):
    token = suffix or uuid.uuid4().hex[:8]
    return {
        "stay": stay,
        "name": f"TEST_r3_{token}",
        "email": f"test_r3_{token}@example.com",
        "check_in": check_in,
        "check_out": check_out,
        "guests": 2,
        "message": "TEST_r3 booking request",
    }


def test_health_root(api_client):
    response = api_client.get(f"{API}/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}


def test_inquiry_create_persist_and_email_path(api_client):
    payload = {
        "name": f"TEST_r3 Inquiry {RUN}",
        "email": f"test_r3_{RUN}@example.com",
        "company": "TEST_r3 Studio",
        "agency": "MARBLE & STONE",
        "budget": "25L-1Cr",
        "message": "TEST_r3 inquiry for a new marble atrium project.",
    }
    created_response = api_client.post(f"{API}/inquiries", json=payload, timeout=40)
    assert created_response.status_code == 201, created_response.text
    created = created_response.json()
    assert created["name"] == payload["name"]
    assert created["email"] == payload["email"]
    assert created["message"] == payload["message"]
    assert isinstance(created["id"], str) and created["id"]
    assert "_id" not in created

    listed_response = api_client.get(f"{API}/inquiries")
    assert listed_response.status_code == 200
    listed = listed_response.json()
    persisted = next(item for item in listed if item["id"] == created["id"])
    assert persisted["company"] == payload["company"]
    assert persisted["agency"] == payload["agency"]
    assert persisted["budget"] == payload["budget"]
    assert "_id" not in persisted


def test_inquiry_validation(api_client):
    invalid_email = api_client.post(
        f"{API}/inquiries",
        json={"name": "TEST_r3 bad", "email": "not-an-email", "message": "valid message"},
    )
    assert invalid_email.status_code == 422
    short_message = api_client.post(
        f"{API}/inquiries",
        json={"name": "TEST_r3 short", "email": "r3short@example.com", "message": "no"},
    )
    assert short_message.status_code == 422


def test_booking_create_persist_and_requested_status(api_client):
    stay = f"TEST_r3_stay_{RUN}"
    start = date.today() + timedelta(days=30)
    payload = booking_payload(stay, start.isoformat(), (start + timedelta(days=2)).isoformat())
    response = api_client.post(f"{API}/bookings", json=payload, timeout=40)
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["stay"] == stay
    assert created["check_in"] == payload["check_in"]
    assert created["check_out"] == payload["check_out"]
    assert created["status"] == "requested"
    assert isinstance(created["id"], str) and created["id"]
    assert "_id" not in created

    listed = api_client.get(f"{API}/bookings").json()
    persisted = next(item for item in listed if item["id"] == created["id"])
    assert persisted["status"] == "requested"
    assert persisted["stay"] == stay


def test_booking_date_validation(api_client):
    stay = f"TEST_r3_invalid_{RUN}"
    bad_order = api_client.post(
        f"{API}/bookings",
        json=booking_payload(stay, "2030-05-03", "2030-05-03"),
    )
    assert bad_order.status_code == 422
    bad_format = api_client.post(
        f"{API}/bookings",
        json=booking_payload(stay, "05/03/2030", "2030-05-05"),
    )
    assert bad_format.status_code == 422


def test_availability_filter_returns_requested_booking(api_client):
    stay = f"TEST_r3_availability_{RUN}"
    start = date.today() + timedelta(days=40)
    payload = booking_payload(stay, start.isoformat(), (start + timedelta(days=1)).isoformat())
    created = api_client.post(f"{API}/bookings", json=payload, timeout=40).json()
    all_availability = api_client.get(f"{API}/stays/availability").json()
    filtered_response = api_client.get(f"{API}/stays/availability", params={"stay": stay})
    assert filtered_response.status_code == 200
    filtered = filtered_response.json()
    assert set(filtered) == {"booked", "requested"}
    assert any(item["stay"] == stay and item["check_in"] == payload["check_in"] for item in filtered["requested"])
    assert all(item["stay"] == stay for group in filtered.values() for item in group)
    assert any(item["stay"] == stay for item in all_availability["requested"])
    assert created["status"] == "requested"


def test_booking_status_flow_and_overlap_conflict(api_client):
    stay = f"TEST_r3_status_{RUN}"
    start = date.today() + timedelta(days=50)
    first_payload = booking_payload(stay, start.isoformat(), (start + timedelta(days=3)).isoformat(), "first")
    first_response = api_client.post(f"{API}/bookings", json=first_payload, timeout=40)
    assert first_response.status_code == 201, first_response.text
    first = first_response.json()

    confirmed_response = api_client.post(
        f"{API}/bookings/{first['id']}/status", json={"status": "confirmed"}
    )
    assert confirmed_response.status_code == 200, confirmed_response.text
    assert confirmed_response.json()["status"] == "confirmed"

    overlap_payload = booking_payload(
        stay, (start + timedelta(days=2)).isoformat(), (start + timedelta(days=4)).isoformat(), "overlap"
    )
    overlap_response = api_client.post(f"{API}/bookings", json=overlap_payload, timeout=40)
    assert overlap_response.status_code == 409, overlap_response.text

    invalid_status = api_client.post(
        f"{API}/bookings/{first['id']}/status", json={"status": "approved"}
    )
    assert invalid_status.status_code == 422
    unknown = api_client.post(
        f"{API}/bookings/TEST_r3_unknown_{RUN}/status", json={"status": "confirmed"}
    )
    assert unknown.status_code == 404



def test_confirming_overlapping_requested_booking_is_rejected(api_client):
    """A pending overlap should not become two confirmed reservations."""
    stay = f"TEST_r3_confirm_overlap_{RUN}"
    start = date.today() + timedelta(days=70)
    first_payload = booking_payload(stay, start.isoformat(), (start + timedelta(days=3)).isoformat(), "pending-a")
    second_payload = booking_payload(
        stay, (start + timedelta(days=1)).isoformat(), (start + timedelta(days=4)).isoformat(), "pending-b"
    )
    first = api_client.post(f"{API}/bookings", json=first_payload, timeout=40)
    second = api_client.post(f"{API}/bookings", json=second_payload, timeout=40)
    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    confirmed = api_client.post(
        f"{API}/bookings/{first.json()['id']}/status", json={"status": "confirmed"}
    )
    assert confirmed.status_code == 200, confirmed.text
    second_confirmed = api_client.post(
        f"{API}/bookings/{second.json()['id']}/status", json={"status": "confirmed"}
    )
    assert second_confirmed.status_code == 409, second_confirmed.text
