---
title: A malformed JSON body gets 500 Internal server error instead of 400
area: api/app/input
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
- Role / account: buyer (fresh registered user) and anonymous

## Steps to reproduce
1. `POST /api/v1/marketplace/buy` with `Content-Type: application/json` and the body `{"offerId":` (truncated), with or without a token.
2. Repeat on `POST /marketplace/offers`, `/fields`, `/financial/transactions`.

## Expected
400 with a message about the invalid body.

## Actual
500 `{ "error": "Internal server error" }` on every endpoint tried. Nothing changes, no internals leak.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/15-invalid-offer-ids.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/15b-malformed-json-other-endpoints.json`

## Frequency
always

## Regression check
Send `{"offerId":` to `POST /marketplace/buy`; expect 400.
