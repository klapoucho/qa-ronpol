---
title: DELETE /fields/:id by a non-owner answers 200 and wipes the owner's staff assignments on that field
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
- Role / account: owner and stranger, fresh registered users

## Steps to reproduce
1. Owner O creates field F and assigns staff to it (`POST /api/v1/fields/assign`).
2. Stranger T calls `DELETE /api/v1/fields/F`.
3. O reads `GET /api/v1/fields` and `GET /api/v1/fields/assign`.

## Expected
403/404, as on `PUT`; nothing changes.

## Actual
200 "field deleted". F stays in O's fields, but O's assignment on F is gone. A non-existent id also answers 200. After a sale the former seller holds the field id and can do this to the buyer.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E3c-stranger-deletes-owner-field.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E3b-non-owner-writes-to-bought-field.json`

## Frequency
always

## Regression check
As a stranger, `DELETE /fields/<owner's field>`; expect 403/404 and the owner's assignments unchanged.
