---
title: An invalid token on buy gets 403 instead of 401
area: api/auth/token
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
- Role / account: anonymous caller with a crafted token

## Steps to reproduce
1. `POST /api/v1/marketplace/buy { offerId: N }` with `Authorization: Bearer not-a-token`.

## Expected
401, as with no token.

## Actual
403 "Invalid or expired token". With no token the answer is 401 "Access token required". Nothing changes.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/16-buy-without-auth.json`

## Frequency
always

## Regression check
Call any authenticated endpoint with `Bearer not-a-token`; expect 401.
