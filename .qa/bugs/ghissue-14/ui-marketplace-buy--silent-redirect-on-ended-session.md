---
title: When the session ends during a purchase, the buyer is sent to the login page with no explanation
area: ui/marketplace/buy
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer (fresh)

## Steps to reproduce
1. Buyer opens Buy Now → "Confirm Purchase".
2. The same session is logged out elsewhere (`POST /api/v1/logout` with that token, as from another tab).
3. Buyer confirms.

## Expected
A message that the session ended and the purchase was not made.

## Actual
Nothing is charged (the buy answers 403, the offer stays active, the balance stays 17.98), but the page jumps straight to `/login.html` with no message.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U20-session-ended-while-modal-open.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U20-after-confirm-with-ended-session.png`

## Frequency
1/1

## Regression check
Log the token out while the modal is open, confirm: a message must say the session ended.
