---
title: Buyer receives a field holding the seller's animals when the seller adds them during the purchase
area: api/marketplace/buy
severity: minor
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
1. Seller lists field F at 30.
2. Buyer (funded 100) calls `POST /api/v1/marketplace/buy`.
3. About 1.5 s into the buy, the seller calls `POST /api/v1/animals { type: sheep, amount: 4, fieldId: F }`.

## Expected
The buy is refused ("Cannot sell field with assigned animals").

## Actual
Buy 200; the buyer owns F with the seller's 4 sheep on it and cannot relist F (400).

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E6-race-animal-on-field-during-buy.json`

## Frequency
1 of 1 attempt

## Regression check
Experiment E6 in `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/scratch/review/exp.mjs`.
