---
title: Seller is told "Offer cancelled successfully" but the offer is sold anyway
area: api/marketplace/offers
severity: minor
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
1. Seller lists a field at 25.
2. Buyer starts `POST /api/v1/marketplace/buy`.
3. About 1.5 s later the seller calls `DELETE /api/v1/marketplace/offers/<id>`.

## Expected
The cancel fails, or the buy fails.

## Actual
Cancel 200 "Offer cancelled successfully"; the buy then completes with 200 and the offer ends `sold`, with the field and the money moved.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E7-race-cancel-during-buy-round1.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E7-race-cancel-during-buy-round2.json`

## Frequency
2 of 2 attempts

## Regression check
Experiment E7 in `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/scratch/review/exp.mjs`.
