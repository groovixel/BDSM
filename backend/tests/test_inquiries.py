"""Backend API tests for BDS Marvel inquiries endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bdsm-project-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_health_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "Hello World" in r.text or r.json()


def test_create_inquiry_valid_and_persistence(session):
    payload = {
        "name": "TEST_Riya Kapoor",
        "email": "test_bdsm@example.com",
        "company": "TEST Company",
        "agency": "Marble & Stone",
        "budget": "25L-1Cr",
        "message": "TEST inquiry - please build us a marble atrium in Mumbai."
    }
    r = session.post(f"{API}/inquiries", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == payload["name"]
    assert body["email"] == payload["email"]
    assert body["company"] == payload["company"]
    assert body["message"] == payload["message"]
    assert "id" in body and len(body["id"]) > 0
    assert "created_at" in body

    # GET list - should include this inquiry (most recent first)
    r2 = session.get(f"{API}/inquiries")
    assert r2.status_code == 200
    rows = r2.json()
    assert isinstance(rows, list) and len(rows) > 0
    ids = [row["id"] for row in rows]
    assert body["id"] in ids
    # ensure _id excluded
    for row in rows:
        assert "_id" not in row


def test_create_inquiry_minimal_fields(session):
    payload = {
        "name": "TEST_Min",
        "email": "test_min@example.com",
        "message": "Hello world minimal test."
    }
    r = session.post(f"{API}/inquiries", json=payload)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["company"] is None
    assert b["agency"] is None
    assert b["budget"] is None


def test_invalid_email_rejected(session):
    r = session.post(f"{API}/inquiries", json={
        "name": "TEST_Bad",
        "email": "not-an-email",
        "message": "This is a valid length message."
    })
    assert r.status_code == 422


def test_short_message_rejected(session):
    r = session.post(f"{API}/inquiries", json={
        "name": "TEST_Short",
        "email": "test_short@example.com",
        "message": "hi"  # < 5 chars
    })
    assert r.status_code == 422


def test_missing_required_fields(session):
    r = session.post(f"{API}/inquiries", json={"name": "TEST_missing"})
    assert r.status_code == 422


def test_list_inquiries_sorted_desc(session):
    r = session.get(f"{API}/inquiries?limit=10")
    assert r.status_code == 200
    rows = r.json()
    if len(rows) >= 2:
        # created_at is ISO string or datetime string - compare
        assert rows[0]["created_at"] >= rows[1]["created_at"]
