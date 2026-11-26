---
title: Double-clicking Create Offer sends two requests and shows "Error" next to "Success"; nothing shows the request is running
area: ui/marketplace/create
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller (fresh account)

## Steps to reproduce
1. Create Offer → Field → pick a free field → price 8.88 → double-click Create Offer.
2. Separately, with the API delayed by 3 s, click Create Offer once and look at the form 0.7 s later.

## Expected
The button is disabled or shows progress while the request runs. One click gives one request and one message.

## Actual
- Two `POST /marketplace/offers` requests. One offer is stored (the server refuses the duplicate).
- The user sees "Error: Item is already offered for sale" **above** "Success: Offer created successfully!", because the 400 came back first.
- On the slow request the button stays enabled with the same label, with no spinner and no message for 3 s, which invites the second click.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U9-double-click-submit.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U9-double-submit-toasts.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U9b-slow-backend-feedback.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U9b-slow-backend-during-submit.png`

## Frequency
always (double click)

## Regression check
Create Offer form, double-click Create Offer: expect one POST and only the success toast.

## Hint for developers (optional)
Disable the button while the request runs.
