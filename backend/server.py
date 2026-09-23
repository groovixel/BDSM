from fastapi import FastAPI, APIRouter, HTTPException
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