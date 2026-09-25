# Import: groovixel/bdsm (branch main)

## What this is
A public GitHub repo containing an existing editorial website called **BDS Marvel** — a
scrolling, magazine-style single-page site with animated article panels and a contact
form. It is imported and brought up as a running project, exactly as it exists in the repo.

## Goal
Bring the project up as-is and confirm it runs end-to-end:
- The site loads and its article/panel scrolling experience works.
- The contact form accepts a submission and stores the inquiry.
- The contact form triggers an email notification to the site owner.

The import is faithful — no features are added, removed, or redesigned. Existing behavior
already present in the repo is preserved.

## Decisions you may want to weigh in on

1. **Contact notification inbox.**
   The contact form emails the site owner whenever someone submits an inquiry. The repo
   currently points this at a placeholder test address, not a real inbox — so inquiries
   would not reach you as-is.
   - **Assumption for now:** keep the placeholder so the flow works and can be verified.
   - **Your call:** provide a real business email address to receive contact inquiries.
     This can also be set later.

2. **Live email confirmation.**
   Verifying that a real inquiry email actually lands in an inbox requires a real
   destination address (see item 1). Until one is provided, email sending is confirmed
   only up to the point of dispatch, not final delivery to your inbox.

## Out of scope
- No visual redesign or new features.
- No content rewriting of the existing articles/site copy.
- No change to how the site currently behaves on desktop vs. mobile.

## Open question
- Do you want to supply a real owner/business email for contact-form notifications now,
  or keep the placeholder for this import and set it later?
