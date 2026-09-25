# BDS Marvel — Import & Run

An editorial portfolio site for a design/architecture studio, with a projects showcase, an Air BnB "stays" booking section, and a contact form.
This plan imports the existing project from GitHub and gets it running exactly as it is today, ready for you to request changes next.

## Who it's for
- The studio itself, showing off its projects and personality to prospective clients.
- Visitors browsing work, exploring bookable stays, and getting in touch.

## Core features and experience
- **Home** — a hero intro followed by scrolling article panels, a client marquee, a "Living Studio" feature, a purpose section, and a contact call-to-action.
- **Projects** — a projects list plus individual case-study pages, each with a "proof in the numbers" outcomes strip that counts up as you scroll.
- **Stays (Air BnB)** — an overview of three tiers (Premium, Mid, Budget-friendly), each with its own page listing several properties (photos, descriptions, amenities, prices) and a "Book this stay" flow.
- **Booking** — guests submit a booking request for chosen dates; requests start as "awaiting confirmation" and can later be confirmed or cancelled; confirmed bookings block those dates so they can't be double-booked.
- **Contact** — a form that stores inquiries and sends the studio an email notification when someone reaches out.
- **Other pages** — About, Catalogue, Experience, Contact.

## User flow
1. Visitor lands on the home page and scrolls through the editorial panels.
2. They browse Projects and open a case study to see details and outcomes.
3. They explore Stays, pick a tier, choose a property, and submit a booking request for their dates.
4. The studio confirms or cancels the request; confirmed dates become unavailable to others.
5. Any visitor can submit the contact form, which notifies the studio by email.

## UI/UX feel
- Editorial, magazine-style layout with large imagery and a smooth panel-snap scrolling experience on desktop.
- Subtle motion: count-up number animations, scroll-driven reveals.
- The imported design and styling are kept as-is; no redesign in this phase.

## Implementation phases

### Phase 1 — MVP (built now)
- Import the repository faithfully and get the full site running: all pages load, navigation works, and the desktop scrolling experience behaves as before.
- Booking flow works end to end (submit request, confirm/cancel, confirmed dates block).
- Contact form stores inquiries and dispatches the notification email.
- Notifications point to the placeholder inbox until a real business email is provided (see Assumptions).

### Phase 2 — Your changes
- The specific changes you want after seeing it running (to be described in your next message).

### Phase 3 — Later polish
- Optional enhancements such as a private page to browse submitted inquiries, an autoresponder to people who contact you, individual detail pages per stay with photo galleries, and replacing placeholder property names/prices/images with real ones.

## Assumptions
- The goal of this phase is to get the existing project running as-is; feature changes come afterward once you describe them.
- No real business email was provided, so contact and booking notifications will continue going to the placeholder inbox (delivery is confirmed but not to a real mailbox) until you supply a real address, at which point they'll be pointed there.
- No existing bug or unfinished item needs fixing as part of this import beyond getting it running.
- Existing content, property listings, prices, and images in the repo are treated as placeholder copy and left unchanged for now.
