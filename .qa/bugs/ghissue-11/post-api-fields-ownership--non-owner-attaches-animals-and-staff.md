---
title: Any user can attach animals and staff to another user's field, which blocks the owner from selling it
area: api/fields/ownership
severity: major
kind: permission-gate
status: open
source: "own: 2026-11-25-issue-11-marketplace-sale-between-two-users"
found: 2026-11-25
last_checked: 2026-11-25 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: owner, stranger and former owner, fresh registered users

## Steps to reproduce
1. User B owns field F (created or bought).
2. A different user calls `POST /api/v1/animals { type: "rat", amount: 1, fieldId: F }` and `POST /api/v1/fields/assign { fieldId: F, staffId: <own staff> }`.
3. B calls `POST /api/v1/marketplace/offers { itemType: "field", itemId: F, price: 20 }`.

## Expected
Step 2 is refused (403/404), as `PUT /fields/F` by a non-owner already is (404).

## Actual
Both writes answer 201. B cannot see the foreign animals, but B's listing fails with 400 "Cannot sell field with assigned animals". `fieldId: 999999` (no such field) is accepted too.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E3b-non-owner-writes-to-bought-field.json`

## Frequency
always

## Regression check
As user T, `POST /animals { fieldId: <another user's field> }`; expect 403/404.
