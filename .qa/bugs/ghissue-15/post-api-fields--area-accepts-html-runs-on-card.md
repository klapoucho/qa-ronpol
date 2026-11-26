---
title: A field's area containing HTML runs as script in every viewer's browser on the Marketplace Browse card
area: api/fields
severity: major
kind: security
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; API (Node fetch)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller (fresh account) and viewer (another registered user)

## Steps to reproduce
1. Seller: `POST /api/v1/fields { "name": "<plain name>", "area": 1.25 }`.
2. `PUT /api/v1/fields/{id} { "area": "2<img src=x onerror=\"document.title='QA-RV15-XSS-AREA'\">" }` (`POST /fields` with that area works too; an array area is also stored).
3. `POST /api/v1/marketplace/offers { itemType: "field", itemId: <id>, price: 2.34, description: "..." }`.
4. Another user opens Marketplace → Browse Offers and reaches the card.

## Expected
`POST`/`PUT /fields` refuse an area that is not a number with 400 (the field form takes a number), and the card shows offer values as plain text.

## Actual
`POST /fields` → 201 and `PUT /fields/{id}` → 200 with the HTML area. `GET /marketplace/offers` serves `details.area` as that string, and the Browse card inserts it as HTML: a broken image after "Area: 2", and its `onerror` runs in the viewer's session (page title becomes "QA-RV15-XSS-AREA"). The victim only views the card. This disproves the field-name bug's note that the name is the only open text on the card: validating names alone leaves this hole open.

## Contract
- OpenAPI: not checked for this field in this run.
- Live: `area` is stored as given (string with HTML, array).
- Who is wrong: the app. Tests: expected failure until fixed.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R1c-api-field-area-shapes.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R4-api-area-html-offer-listed.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R4-live-area-html-runs-in-viewer-browse.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R4-live-area-html-runs-in-viewer-browse.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/console-R4-live-area-html-runs-in-viewer-browse.txt`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R4-cleanup.json`

## Frequency
1/1, deterministic

## Regression check
`PUT /api/v1/fields/{id}` with `area: "2<b>x</b>"` must answer 400. UI: a mocked offer with an HTML `details.area` must not change `document.title`.

## Hint for developers (optional)
Same card code as `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` (card values go into `innerHTML`), but a different input with its own server-side gap.
