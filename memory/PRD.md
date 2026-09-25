# PRD — BDS Marvel (BDSM) — GitHub Import & Run

## Original Problem Statement
Import the public GitHub repo https://github.com/groovixel/BDSM.git (branch main) as a new
project and get it running exactly as-is. Editorial portfolio site for a design/architecture
studio with projects showcase, an Air BnB "stays" booking section, and a contact form.

## Architecture
- **Frontend**: React 19 + CRACO (Yarn), Tailwind, Lenis smooth scroll, framer-motion.
  Single-file app in `frontend/src/App.js` (editorial magazine layout, panel-snap scroll,
  count-up animations, scroll reveals). Path alias `@/` via craco.config.js.
- **Backend**: FastAPI (`backend/server.py`), Motor (async MongoDB). All routes under `/api`.
- **Database**: MongoDB via `MONGO_URL` + `DB_NAME`.
- **Email**: Emergent-managed Resend (`send_email` + `_assert_safe_email` guardrail gate).
  Fires on contact-form submit and booking request → notifies `OWNER_EMAIL`.

## User Personas
- The studio (owner) — showcases work, receives inquiries + booking requests, confirms/cancels.
- Visitors — browse projects/case studies, explore stays, submit bookings and contact inquiries.

## Core Requirements (static)
- Faithful import of the repo; run full site (all pages, nav, desktop panel-snap scroll).
- Booking flow end-to-end: submit request (status `requested`), owner confirm/cancel,
  confirmed dates block overlapping dates (no double-booking).
- Contact form stores inquiries and dispatches owner notification email.

## Implemented (2026-09-25, pass 2) — Catalogue detail + mobile EXPLORE fix
- Bug fix (user-reported): EXPLORE button was hidden on mobile (≤800px) for all six
  business-network panels — removed the `display:none` rule; EXPLORE now shows and opens
  each article's full detail page (/businesses/:slug) on mobile and desktop.
- Catalogue Detail feature: dedicated `/catalogue/:slug` page for all 36 catalogue items
  (18 main library items + 18 per-service catalogue cards) — hero, 3-photo detail gallery,
  spec sheet, REQUEST SAMPLE (contact modal) + GET CONSULTATION (preselects service).
- Per-service catalogue cards and main catalogue cards now link to their detail pages;
  unknown slugs redirect to /catalogue. Testing agent: 13/13 assertions passed.

## Implemented (2026-09-25) — fresh import of `groovixel/bbd` main, verified running
- Cloned `groovixel/bbd` (main, commit 80d172c) as-is into `/app`; no feature changes.
- Config wired: `backend/.env` (MONGO_URL, DB_NAME=bds_marvel, EMERGENT_EMAIL_KEY
  provisioned by platform, OWNER_EMAIL=delivered@resend.dev placeholder as specified),
  `frontend/.env` (REACT_APP_BACKEND_URL, public-safe only).
- Deps installed: backend `pip install -r requirements.txt`, frontend `yarn install`
  (no lockfile in repo, so --frozen-lockfile not applicable).
- Smoke test passed: frontend loads; `/api/` health; `/api/status` POST+GET (Mongo
  verified); `/api/inquiries` 201 + owner notification email sent (202 via proxy);
  `/api/bookings` create → confirm; overlapping dates correctly blocked with 409;
  `/api/stays/availability` responds.
- Security note upheld: no secrets under REACT_APP_; email/LLM keys server-side only.

## Implemented (2026-06) — original session
- Cloned repo source into `/app` (frontend + backend). Deps installed: frontend `lenis`,
  backend `httpx`. `.env` files created with protected keys preserved.
- Backend `/api/` health, `/api/inquiries` (POST/GET), `/api/bookings` (POST/GET),
  `/api/stays/availability`, `/api/bookings/{id}/status` — all verified 200.
- Email wired to Emergent Resend; `OWNER_EMAIL=delivered@resend.dev` (placeholder inbox).
- Fixed a booking double-book gap: confirmation now also rejects (409) overlapping
  already-confirmed bookings for the same stay (previously overlap was only checked at create).
- Testing agent: frontend clean (no UI bugs); all core API + UI flows reachable and working.

## Backlog / Remaining
- **P0**: Set real `OWNER_EMAIL` in `backend/.env` so inquiries/bookings reach a real inbox.
- **P1**: Owner-facing page to review/confirm/cancel bookings + browse inquiries (currently
  status endpoints are open/no auth — as in source).
- **P2**: Stricter date-format validation (non-padded dates like `2099-1-01` accepted).
- **P2**: Per-stay detail pages with photo galleries; replace placeholder names/prices/images.
- **P2**: Contact autoresponder to the person who reached out.

## Notes
- No authentication in the app (no test credentials needed).
- Content, property listings, prices and images are placeholder copy, left unchanged.
