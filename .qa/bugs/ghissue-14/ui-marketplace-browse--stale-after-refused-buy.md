---
title: After a refused purchase the sold or cancelled offer stays in Browse with an enabled Buy Now, and the balance line shows an old value
area: ui/marketplace/browse
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
- Role / account: buyer (fresh), rival buyer, seller

## Steps to reproduce
1. Buyer opens Buy Now → "Confirm Purchase" on an offer.
2. While the modal is open: (a) another buyer buys the offer, or (b) the seller cancels it, or (c) the buyer's balance drops below the price elsewhere.
3. Buyer confirms.

## Expected
The refusal message, then the current state: the offer is gone from Browse and the balance line shows the real balance.

## Actual
The refusals are right and nothing is charged: (a) and (b) answer 404 "Offer not found or not available", (c) 400 "Insufficient funds…". But the sold or cancelled card stays in Browse with an enabled Buy Now (in (a) still there 10 s later), and the balance line keeps 31.31 ROL while the real balance is 17.16.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U15-rival-buys-while-modal-open.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U15-rival-bought-while-modal-open.png`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U16-seller-cancels-while-modal-open.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U17-balance-drops-while-modal-open.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U17-balance-dropped-while-modal-open.png`

## Frequency
3/3 (one per variant)

## Regression check
Open the modal, buy the offer as another user through the API, confirm: the card must disappear after the 404 toast.
