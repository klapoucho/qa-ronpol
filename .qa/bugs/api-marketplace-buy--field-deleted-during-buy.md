---
title: Buyer pays and receives nothing when the seller deletes the field during the purchase
area: api/marketplace/buy
severity: major
kind: functional
status: open
source: "own: 2026-11-25-issue-11-marketplace-sale-between-two-users"
found: 2026-11-25
last_checked: 2026-11-25 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and buyer, fresh registered users

## Steps to reproduce
1. Seller registers, `POST /api/v1/fields`, lists the field at 60 (`POST /api/v1/marketplace/offers`).
2. Buyer is funded with 100 and calls `POST /api/v1/marketplace/buy { offerId }` (takes ~4 s).
3. While the buy is running (0.3–3 s in), the seller calls `DELETE /api/v1/fields/<id>`.
4. Read the buyer's `/fields`, `/financial/account`, `/marketplace/transactions` and the seller's `/marketplace/my-offers`.

## Expected
The buy is refused (404) with nothing charged, or the payment is reversed.

## Actual
Buy 200 "Purchase completed successfully", delete 200. Buyer 100 → 40 with an expense of 60, seller 0 → 60, offer `sold`, transaction `completed`; the buyer's `/fields` is empty.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E5-race-delete-field-during-buy-round1.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E5-race-delete-field-during-buy-round2.json`

## Frequency
5 of 6 attempts

## Regression check
`node .qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/scratch/review/exp.mjs` (experiment E5) against fresh users; or the steps above by hand.

## Hint for developers (optional)
The ownership transfer quietly does nothing when the field is gone, so no reversal runs; field deletion does not take the ledger lock.
