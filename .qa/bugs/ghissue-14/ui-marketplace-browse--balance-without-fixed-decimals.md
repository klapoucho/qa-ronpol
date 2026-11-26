---
title: Marketplace money amounts drop trailing zeros ("31.3 ROL", "20.2 ROL", "0 ROL"), and each screen formats money its own way
area: ui/marketplace/browse
severity: cosmetic
kind: ui-consistency
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
1. Fund a buyer to 31.30 and list another user's field at 20.20.
2. Open Marketplace → Browse, buy the 20.20 offer, open Transaction History, then the Financial page.

## Expected
One money format across the product with two decimals, e.g. "31.30 ROL", "20.20 ROL", "0.00 ROL".

## Actual
Marketplace drops trailing zeros everywhere: balance "31.3 ROL" / "10.1 ROL" / "0 ROL", card price "20.2 ROL" next to "31.31 ROL", history "-20.2 ROL". The Financial page shows "+20,20 ROL" / "18,53 ROL" (decimal comma, two decimals) and the Marketplace header "508 163,38". (The first filing said prices always had two decimals; the review corrected that.)

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U6-one-cent-below-error-toast.png`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U7-exact-balance.json`

- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R4a-back-to-back-end.png`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R4b-two-offers-exceed-balance.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R1-financial-page-buyer-and-seller.json`

## Frequency
always

## Regression check
Balance 31.30 and an offer at 20.20: `#userBalance` must read `31.30 ROL` and the card `.offer-price` `20.20 ROL`.
