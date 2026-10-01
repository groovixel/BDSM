from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import re
import ipaddress
import httpx
import requests
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# --- Email notifications (Emergent managed Resend) ---

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
OWNER_EMAIL = os.environ["OWNER_EMAIL"]

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html,
               "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


def _inquiry_email_html(inq: "Inquiry") -> str:
    def row(label, value):
        return (f'<tr><td style="padding:8px 16px 8px 0;color:#8a8577;font-size:11px;'
                f'letter-spacing:2px;text-transform:uppercase;vertical-align:top">{label}</td>'
                f'<td style="padding:8px 0;font-size:14px;color:#141414">{value}</td></tr>')
    rows = row("Name", escape(inq.name))
    rows += row("Email", f'<a href="mailto:{escape(inq.email)}" style="color:#141414">{escape(inq.email)}</a>')
    if inq.company:
        rows += row("Company", escape(inq.company))
    if inq.agency:
        rows += row("Business", escape(inq.agency))
    if inq.budget:
        rows += row("Budget", escape(inq.budget))
    rows += row("Message", escape(inq.message).replace("\n", "<br />"))
    return ('<table role="presentation" width="100%" style="background:#f5f2ea;padding:32px 0">'
            '<tr><td align="center"><table role="presentation" width="560" '
            'style="background:#ffffff;padding:32px;font-family:Arial,sans-serif">'
            '<tr><td><p style="font-size:11px;letter-spacing:3px;color:#8a8577;margin:0 0 8px">BDS MARVEL &middot; NEW INQUIRY</p>'
            '<h1 style="font-size:22px;margin:0 0 24px;color:#141414">New project inquiry</h1>'
            f'<table role="presentation" width="100%">{rows}</table>'
            f'<p style="font-size:12px;color:#8a8577;margin:24px 0 0">Sent by the {escape(EMAIL_FROM_NAME)} website contact form. We never ask for passwords or card details by email.</p>'
            '</td></tr></table></td></tr></table>')


# --- Inquiries (Contact form) ---

class InquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: Optional[str] = Field(default=None, max_length=160)
    agency: Optional[str] = Field(default=None, max_length=80)
    budget: Optional[str] = Field(default=None, max_length=60)
    message: str = Field(min_length=5, max_length=4000)


class Inquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    company: Optional[str] = None
    agency: Optional[str] = None
    budget: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/inquiries", response_model=Inquiry, status_code=201)
async def create_inquiry(payload: InquiryCreate):
    inquiry = Inquiry(**payload.model_dump())
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.inquiries.insert_one(doc)
    logger.info("New inquiry from %s <%s>", inquiry.name, inquiry.email)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"New project inquiry - {inquiry.name}",
                         html=_inquiry_email_html(inquiry))
        logger.info("Inquiry notification emailed to %s", OWNER_EMAIL)
    except Exception as exc:
        logger.error("Inquiry saved but email notification failed: %s", exc)
    return inquiry


@api_router.get("/inquiries", response_model=List[Inquiry])
async def list_inquiries(limit: int = 50):
    limit = max(1, min(limit, 200))
    rows = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for row in rows:
        if isinstance(row.get('created_at'), str):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
    return rows


# --- Stay bookings (Air BnB booking requests) ---

class BookingCreate(BaseModel):
    stay: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    check_in: str
    check_out: str
    guests: int = Field(ge=1, le=16)
    message: Optional[str] = Field(default=None, max_length=1000)


class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stay: str
    name: str
    email: str
    check_in: str
    check_out: str
    guests: int
    message: Optional[str] = None
    status: str = "requested"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _booking_email_html(bk: "Booking") -> str:
    def row(label, value):
        return (f'<tr><td style="padding:8px 16px 8px 0;color:#8a8577;font-size:11px;'
                f'letter-spacing:2px;text-transform:uppercase;vertical-align:top">{label}</td>'
                f'<td style="padding:8px 0;font-size:14px;color:#141414">{value}</td></tr>')
    rows = row("Stay", escape(bk.stay))
    rows += row("Dates", f'{escape(bk.check_in)} &rarr; {escape(bk.check_out)}')
    rows += row("Guests", str(bk.guests))
    rows += row("Name", escape(bk.name))
    rows += row("Email", f'<a href="mailto:{escape(bk.email)}" style="color:#141414">{escape(bk.email)}</a>')
    if bk.message:
        rows += row("Notes", escape(bk.message).replace("\n", "<br />"))
    return ('<table role="presentation" width="100%" style="background:#f5f2ea;padding:32px 0">'
            '<tr><td align="center"><table role="presentation" width="560" '
            'style="background:#ffffff;padding:32px;font-family:Arial,sans-serif">'
            '<tr><td><p style="font-size:11px;letter-spacing:3px;color:#8a8577;margin:0 0 8px">BDS MARVEL &middot; STAY BOOKING</p>'
            '<h1 style="font-size:22px;margin:0 0 24px;color:#141414">New booking request</h1>'
            f'<table role="presentation" width="100%">{rows}</table>'
            f'<p style="font-size:12px;color:#8a8577;margin:24px 0 0">Sent by the {escape(EMAIL_FROM_NAME)} website stays page. We never ask for passwords or card details by email.</p>'
            '</td></tr></table></td></tr></table>')


@api_router.post("/bookings", response_model=Booking, status_code=201)
async def create_booking(payload: BookingCreate):
    try:
        check_in = datetime.strptime(payload.check_in, "%Y-%m-%d").date()
        check_out = datetime.strptime(payload.check_out, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail="Dates must be YYYY-MM-DD")
    if check_out <= check_in:
        raise HTTPException(status_code=422, detail="Check-out must be after check-in")
    existing = await db.bookings.find({"stay": payload.stay, "status": "confirmed"}, {"_id": 0, "check_in": 1, "check_out": 1}).to_list(500)
    for other in existing:
        if payload.check_in < other["check_out"] and payload.check_out > other["check_in"]:
            raise HTTPException(status_code=409, detail=f"Those nights are already booked ({other['check_in']} to {other['check_out']}). Please pick different dates.")
    booking = Booking(**payload.model_dump())
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookings.insert_one(doc)
    logger.info("New booking request for %s from %s <%s>", booking.stay, booking.name, booking.email)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"New stay booking - {booking.stay}",
                         html=_booking_email_html(booking))
        logger.info("Booking notification emailed to %s", OWNER_EMAIL)
    except Exception as exc:
        logger.error("Booking saved but email notification failed: %s", exc)
    return booking


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(limit: int = 50):
    limit = max(1, min(limit, 200))
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for row in rows:
        if isinstance(row.get('created_at'), str):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
    return rows


@api_router.get("/stays/availability")
async def stays_availability(stay: Optional[str] = None):
    query = {"stay": stay} if stay else {}
    projection = {"_id": 0, "stay": 1, "check_in": 1, "check_out": 1}
    confirmed = await db.bookings.find({**query, "status": "confirmed"}, projection).to_list(1000)
    requested = await db.bookings.find({**query, "status": "requested"}, projection).to_list(1000)
    return {"booked": confirmed, "requested": requested}


class BookingStatusUpdate(BaseModel):
    status: str


@api_router.post("/bookings/{booking_id}/status", response_model=Booking)
async def update_booking_status(booking_id: str, payload: BookingStatusUpdate):
    if payload.status not in ("requested", "confirmed", "cancelled"):
        raise HTTPException(status_code=422, detail="Status must be requested, confirmed or cancelled")
    target = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Booking not found")
    if payload.status == "confirmed":
        others = await db.bookings.find(
            {"stay": target["stay"], "status": "confirmed", "id": {"$ne": booking_id}},
            {"_id": 0, "check_in": 1, "check_out": 1},
        ).to_list(500)
        for other in others:
            if target["check_in"] < other["check_out"] and target["check_out"] > other["check_in"]:
                raise HTTPException(status_code=409, detail=f"Those nights are already confirmed for another guest ({other['check_in']} to {other['check_out']}).")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": payload.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    logger.info("Booking %s marked %s", booking_id, payload.status)
    return doc


# --- Object storage (Emergent) for optional consultation file uploads ---

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "bdsmarvel"
_storage_key = None

_MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "webp": "image/webp", "heic": "image/heic", "pdf": "application/pdf",
}


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


@api_router.post("/consultations/upload")
async def upload_consultation_file(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 15MB)")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    content_type = file.content_type or _MIME_TYPES.get(ext, "application/octet-stream")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/consultations/{file_id}.{ext}"
    try:
        result = put_object(path, data, content_type)
    except Exception as exc:
        logger.error("Consultation file upload failed: %s", exc)
        raise HTTPException(status_code=502, detail="File upload failed, please try again")
    await db.consultation_files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "filename": file.filename, "url": f"/api/files/{file_id}"}


@api_router.get("/files/{file_id}")
async def download_file(file_id: str):
    record = await db.consultation_files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))


# --- Consultation inquiries (per-service consulting requests) ---

class ConsultationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=40)
    email: EmailStr
    city: Optional[str] = Field(default=None, max_length=120)
    project_type: Optional[str] = Field(default=None, max_length=120)
    service: str = Field(min_length=1, max_length=120)
    requirements: str = Field(min_length=3, max_length=4000)
    project_size: Optional[str] = Field(default=None, max_length=120)
    budget: Optional[str] = Field(default=None, max_length=60)
    file_id: Optional[str] = Field(default=None, max_length=60)
    file_name: Optional[str] = Field(default=None, max_length=260)


class Consultation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str
    city: Optional[str] = None
    project_type: Optional[str] = None
    service: str
    requirements: str
    project_size: Optional[str] = None
    budget: Optional[str] = None
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _consultation_email_html(c: "Consultation") -> str:
    def row(label, value):
        return (f'<tr><td style="padding:8px 16px 8px 0;color:#8a8577;font-size:11px;'
                f'letter-spacing:2px;text-transform:uppercase;vertical-align:top">{label}</td>'
                f'<td style="padding:8px 0;font-size:14px;color:#141414">{value}</td></tr>')
    rows = row("Service", escape(c.service))
    rows += row("Name", escape(c.name))
    rows += row("Phone", escape(c.phone))
    rows += row("Email", f'<a href="mailto:{escape(c.email)}" style="color:#141414">{escape(c.email)}</a>')
    if c.city:
        rows += row("City", escape(c.city))
    if c.project_type:
        rows += row("Project type", escape(c.project_type))
    if c.project_size:
        rows += row("Project size", escape(c.project_size))
    if c.budget:
        rows += row("Budget", escape(c.budget))
    rows += row("Requirements", escape(c.requirements).replace("\n", "<br />"))
    if c.file_name:
        rows += row("Attachment", escape(c.file_name))
    return ('<table role="presentation" width="100%" style="background:#f5f2ea;padding:32px 0">'
            '<tr><td align="center"><table role="presentation" width="560" '
            'style="background:#ffffff;padding:32px;font-family:Arial,sans-serif">'
            '<tr><td><p style="font-size:11px;letter-spacing:3px;color:#8a8577;margin:0 0 8px">BDS MARVEL &middot; CONSULTATION</p>'
            '<h1 style="font-size:22px;margin:0 0 24px;color:#141414">New consultation request</h1>'
            f'<table role="presentation" width="100%">{rows}</table>'
            f'<p style="font-size:12px;color:#8a8577;margin:24px 0 0">Sent by the {escape(EMAIL_FROM_NAME)} website consultation form. We never ask for passwords or card details by email.</p>'
            '</td></tr></table></td></tr></table>')


@api_router.post("/consultations", response_model=Consultation, status_code=201)
async def create_consultation(payload: ConsultationCreate):
    consultation = Consultation(**payload.model_dump())
    doc = consultation.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.consultations.insert_one(doc)
    logger.info("New consultation (%s) from %s <%s>", consultation.service, consultation.name, consultation.email)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"New consultation - {consultation.service}",
                         html=_consultation_email_html(consultation))
        logger.info("Consultation notification emailed to %s", OWNER_EMAIL)
    except Exception as exc:
        logger.error("Consultation saved but email notification failed: %s", exc)
    return consultation


@api_router.get("/consultations", response_model=List[Consultation])
async def list_consultations(limit: int = 50):
    limit = max(1, min(limit, 200))
    rows = await db.consultations.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for row in rows:
        if isinstance(row.get('created_at'), str):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
    return rows



# --- Shared email helpers ---

def _email_row(label, value):
    return (f'<tr><td style="padding:8px 16px 8px 0;color:#8a8577;font-size:11px;'
            f'letter-spacing:2px;text-transform:uppercase;vertical-align:top">{label}</td>'
            f'<td style="padding:8px 0;font-size:14px;color:#141414">{value}</td></tr>')


def _email_shell(kicker: str, title: str, rows: str, source: str) -> str:
    return ('<table role="presentation" width="100%" style="background:#f5f2ea;padding:32px 0">'
            '<tr><td align="center"><table role="presentation" width="560" '
            'style="background:#ffffff;padding:32px;font-family:Arial,sans-serif">'
            f'<tr><td><p style="font-size:11px;letter-spacing:3px;color:#8a8577;margin:0 0 8px">BDS MARVEL &middot; {kicker}</p>'
            f'<h1 style="font-size:22px;margin:0 0 24px;color:#141414">{title}</h1>'
            f'<table role="presentation" width="100%">{rows}</table>'
            f'<p style="font-size:12px;color:#8a8577;margin:24px 0 0">Sent by the {escape(EMAIL_FROM_NAME)} website {source}. We never ask for passwords or card details by email.</p>'
            '</td></tr></table></td></tr></table>')


# --- Sample requests (catalogue "Request Sample" form) ---

class SampleRequestCreate(BaseModel):
    product: str = Field(min_length=1, max_length=160)
    brand: Optional[str] = Field(default=None, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    address: str = Field(min_length=5, max_length=500)
    city: Optional[str] = Field(default=None, max_length=120)
    pincode: Optional[str] = Field(default=None, max_length=12)
    notes: Optional[str] = Field(default=None, max_length=1000)


class SampleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product: str
    brand: Optional[str] = None
    name: str
    email: str
    phone: str
    address: str
    city: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None
    status: str = "requested"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _sample_request_email_html(sr: "SampleRequest") -> str:
    rows = _email_row("Product", escape(sr.product))
    if sr.brand:
        rows += _email_row("Brand", escape(sr.brand))
    rows += _email_row("Name", escape(sr.name))
    rows += _email_row("Phone", escape(sr.phone))
    rows += _email_row("Email", f'<a href="mailto:{escape(sr.email)}" style="color:#141414">{escape(sr.email)}</a>')
    rows += _email_row("Ship to", escape(sr.address).replace("\n", "<br />"))
    if sr.city:
        rows += _email_row("City", escape(sr.city))
    if sr.pincode:
        rows += _email_row("Pincode", escape(sr.pincode))
    if sr.notes:
        rows += _email_row("Notes", escape(sr.notes).replace("\n", "<br />"))
    return _email_shell("SAMPLE REQUEST", "New sample request", rows, "sample request form")


@api_router.post("/sample-requests", response_model=SampleRequest, status_code=201)
async def create_sample_request(payload: SampleRequestCreate):
    sample = SampleRequest(**payload.model_dump())
    doc = sample.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sample_requests.insert_one(doc)
    logger.info("New sample request (%s) from %s <%s>", sample.product, sample.name, sample.email)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"New sample request - {sample.product}",
                         html=_sample_request_email_html(sample))
        logger.info("Sample request notification emailed to %s", OWNER_EMAIL)
    except Exception as exc:
        logger.error("Sample request saved but email notification failed: %s", exc)
    return sample


@api_router.get("/sample-requests", response_model=List[SampleRequest])
async def list_sample_requests(limit: int = 50):
    limit = max(1, min(limit, 200))
    rows = await db.sample_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for row in rows:
        if isinstance(row.get('created_at'), str):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
    return rows


# --- Product inquiries (brand-page "Make an Inquiry" form) ---

class ProductInquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    brand: str = Field(min_length=1, max_length=120)
    product: Optional[str] = Field(default=None, max_length=160)
    quantity: Optional[str] = Field(default=None, max_length=120)
    message: str = Field(min_length=5, max_length=4000)


class ProductInquiry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    brand: str
    product: Optional[str] = None
    quantity: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _product_inquiry_email_html(pi: "ProductInquiry") -> str:
    rows = _email_row("Brand", escape(pi.brand))
    if pi.product:
        rows += _email_row("Product", escape(pi.product))
    if pi.quantity:
        rows += _email_row("Quantity", escape(pi.quantity))
    rows += _email_row("Name", escape(pi.name))
    rows += _email_row("Email", f'<a href="mailto:{escape(pi.email)}" style="color:#141414">{escape(pi.email)}</a>')
    if pi.phone:
        rows += _email_row("Phone", escape(pi.phone))
    rows += _email_row("Message", escape(pi.message).replace("\n", "<br />"))
    return _email_shell("PRODUCT INQUIRY", f"New {escape(pi.brand)} product inquiry", rows, "product inquiry form")


@api_router.post("/product-inquiries", response_model=ProductInquiry, status_code=201)
async def create_product_inquiry(payload: ProductInquiryCreate):
    inquiry = ProductInquiry(**payload.model_dump())
    doc = inquiry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.product_inquiries.insert_one(doc)
    logger.info("New product inquiry (%s / %s) from %s <%s>", inquiry.brand, inquiry.product or "-", inquiry.name, inquiry.email)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"New product inquiry - {inquiry.brand}",
                         html=_product_inquiry_email_html(inquiry))
        logger.info("Product inquiry notification emailed to %s", OWNER_EMAIL)
    except Exception as exc:
        logger.error("Product inquiry saved but email notification failed: %s", exc)
    return inquiry


@api_router.get("/product-inquiries", response_model=List[ProductInquiry])
async def list_product_inquiries(limit: int = 50):
    limit = max(1, min(limit, 200))
    rows = await db.product_inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for row in rows:
        if isinstance(row.get('created_at'), str):
            row['created_at'] = datetime.fromisoformat(row['created_at'])
    return rows


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()