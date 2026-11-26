---
title: Seller is told "Offer cancelled successfully" but the offer is sold anyway
area: api/marketplace/offers
severity: major
kind: functional
status: open
source: "own: 2026-11-25-issue-11-marketplace-sale-between-two-users"
found: 2026-11-25
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and buyer, fresh registered users

## Steps to reproduce
1. Seller lists a field at 25.
2. Buyer starts `POST /api/v1/marketplace/buy`.
3. About 1.5 s later the seller calls `DELETE /api/v1/marketplace/offers/<id>`.

## Expected
The cancel fails, or the buy fails.

## Actual
Cancel 200 "Offer cancelled successfully"; the buy then completes with 200 and the offer ends `sold`, with the field and the money moved.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/F6-cancel-during-buy.json` (2026-11-26 re-check, 2 of 2; severity raised to major: a seller cancelling during a buy needs no crafted input, and the seller is told the opposite of what happened. It also contradicts issue #12 AC-7, "a cancelled offer cannot be bought")
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E7-race-cancel-during-buy-round1.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E7-race-cancel-during-buy-round2.json`

## Frequency
2 of 2 attempts

## Regression check
Experiment E7 in `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/scratch/review/exp.mjs`.
