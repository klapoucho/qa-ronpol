---
title: After a sale, the seller's staff assignment stays on the buyer's field
area: api/marketplace/buy
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
1. Seller assigns staff to field F (`POST /api/v1/fields/assign`).
2. Seller lists F; a buyer buys it.
3. Both read `GET /api/v1/fields/assign`.

## Expected
The assignment is removed when the field changes owner.

## Actual
The seller still lists `{ fieldId: F, staffId: <seller's staff> }`; the buyer sees nothing.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E3-staff-assignment-and-seller-access.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E3b-non-owner-writes-to-bought-field.json`

## Frequency
always

## Regression check
Assign staff, sell the field, read the seller's `/fields/assign`.
