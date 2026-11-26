---
title: A field name containing HTML runs as script in every buyer's browser on the Marketplace offer card
area: ui/marketplace/browse
severity: major
kind: security
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000 · Platform: Chromium 1366x768 (playwright-cli) and API
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and buyer, fresh registered users

## Steps to reproduce
1. Seller: `POST /api/v1/fields { "name": "QA<img src=x onerror=\"document.title='QA-XSS-FIRED'\">", "area": 2.5 }` → 201, the name is stored as sent.
2. Seller lists it: `POST /api/v1/marketplace/offers { itemType: "field", itemId: <id>, price: 3.21 }`.
3. Another user logs in and opens Marketplace → Browse Offers.

## Expected
The field name shows as plain text on the card. The offer description is whitelisted (issue #12 AC-1) to keep markup off this card; the field name needs the same protection (validation or escaping).

## Actual
The `<img>` is inserted into the card and its `onerror` runs in the buyer's session: the page title becomes `QA-XSS-FIRED`. `PUT /fields/{id}` also accepts HTML names (`<b>bold</b>` → 200), so a seller can change the name after listing. Animal types are a whitelist and display names are validated, so the field name is the only open text found on the card.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/X2-buyer-browse-dom.json` (page title and card HTML)
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/X2-html-field-name-executes-in-browse.png`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/X2-seed-html-field-name-offer.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/X1-html-in-other-offer-card-fields.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/console-04-marketplace-filtered.txt` (the payload's 404 for `/x`)

## Frequency
always (1 of 1, deterministic)

## Regression check
Seed a field named `QA<img src=x onerror="document.title='QA-XSS-FIRED'">`, list it, open Marketplace as another user and read `document.title`; `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/scratch/xss-*.mjs`.

## Hint for developers (optional)
`public/js/pages/marketplace.js` builds the card from template strings into `innerHTML` (`details.name`, `details.type`, `sellerLabel`, `description`).

## Re-checks
- Re-checked 2026-11-26 in `2026-11-26-issue-13-marketplace-seller-lists-an-item` (U13): still reproduces, and it also runs in the seller's own **My Offers**, right after the create and on every load while the (even cancelled) offer is listed. The cancel-confirmation modal escapes the name (R7). Evidence: `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U13-html-field-name-my-offers.json`, `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U13b-observer-browse-html-name.json`.
