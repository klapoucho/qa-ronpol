---
title: Buying with offerId 0 is refused as "Missing required field: offerId"
area: api/marketplace/buy
severity: cosmetic
kind: functional
status: open
source: "own: 2026-11-25-issue-11-marketplace-sale-between-two-users"
found: 2026-11-25
last_checked: 2026-11-25 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer, fresh registered user

## Steps to reproduce
1. `POST /api/v1/marketplace/buy { "offerId": 0 }`.

## Expected
404, or 400 naming an invalid id.

## Actual
400 "Missing required field: offerId" although the field is present.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/15-invalid-offer-ids.json`

## Frequency
always

## Regression check
Buy with `offerId: 0`; check the message.
