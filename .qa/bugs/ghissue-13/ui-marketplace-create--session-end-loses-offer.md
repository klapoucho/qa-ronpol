---
title: When the session ends elsewhere, Create Offer redirects to the login page without a message and the typed offer is lost
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
1. Fill the Create Offer form (field, price 11.11, a long description).
2. Log the same user in somewhere else (here `POST /login` through the API; a new login replaces the old token, A0).
3. Click Create Offer.

## Expected
A message such as "Your session has expired, log in again", ideally keeping the input or returning the user to the form after login.

## Actual
the request gets 403. The app deletes all `rolnopol*` cookies and loads `/login.html` with an empty form and no explanation in view. The typed offer is gone.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U10-form-filled-before-session-end.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U10-session-ended-while-form-filled.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U10-after-submit-redirected.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/A0-login-replaces-previous-token.json`

## Frequency
always

## Regression check
Fill the form, `POST /api/v1/login` as the same user, submit: expect a session-expired message.
