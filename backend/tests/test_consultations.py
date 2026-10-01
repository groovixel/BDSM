"""Backend tests: consultations, file uploads, inquiries."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://github-import-161.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- Consultations ---
class TestConsultations:
    def test_create_consultation_no_file(self, s):
        payload = {
            "name": "TEST_Consult User",
            "phone": "+91-9999900001",
            "email": "TEST_consult@example.com",
            "service": "Marble & Stone Consulting",
            "requirements": "Need marble slabs for a 3BHK. Please advise on veined options.",
        }
        r = s.post(f"{API}/consultations", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["service"] == payload["service"]
        assert data["email"] == payload["email"]
        assert "id" in data and len(data["id"]) > 0
        pytest.consult_id = data["id"]

    def test_list_consultations_includes_created(self, s):
        r = s.get(f"{API}/consultations?limit=200", timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        ids = [row["id"] for row in rows]
        assert getattr(pytest, "consult_id", None) in ids

    def test_consultation_file_upload_and_download(self, s):
        # tiny PNG
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
               b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
               b"\xc0\x00\x00\x00\x03\x00\x01\x5b\xea\x7e\xd0\x00\x00\x00\x00IEND\xaeB`\x82")
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = s.post(f"{API}/consultations/upload", files=files, timeout=60)
        assert r.status_code == 200, r.text
        up = r.json()
        assert "id" in up and up["url"].endswith(up["id"])
        file_id = up["id"]

        # download
        d = s.get(f"{API}/files/{file_id}", timeout=30)
        assert d.status_code == 200
        assert d.content == png

        # submit consultation with file
        payload = {
            "name": "TEST_Consult File",
            "phone": "+91-9999900002",
            "email": "TEST_consultfile@example.com",
            "service": "Flooring Consulting",
            "requirements": "Attaching floor plan for reference.",
            "file_id": file_id,
            "file_name": "test.png",
        }
        r2 = s.post(f"{API}/consultations", json=payload, timeout=30)
        assert r2.status_code == 201, r2.text
        assert r2.json()["file_id"] == file_id

    def test_consultation_validation_error(self, s):
        r = s.post(f"{API}/consultations", json={"name": "x"}, timeout=15)
        assert r.status_code == 422

    def test_file_not_found(self, s):
        r = s.get(f"{API}/files/nonexistent-id-xyz", timeout=15)
        assert r.status_code == 404


# --- Inquiries (contact modal) ---
class TestInquiries:
    def test_create_inquiry(self, s):
        payload = {
            "name": "TEST_Inquiry User",
            "email": "TEST_inq@example.com",
            "phone": "+91-9999900003",
            "message": "Please contact me about a project.",
        }
        r = s.post(f"{API}/inquiries", json=payload, timeout=30)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["email"] == payload["email"]
        assert "id" in data
