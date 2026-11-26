---
title: Buying with offerId sent as a string answers 404 for an existing active offer
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
- Role / account: buyer, fresh registered user

## Steps to reproduce
1. A funded buyer and an active offer with id N.
2. `POST /api/v1/marketplace/buy { "offerId": "N" }`.

## Expected
The offer is bought (cancel accepts the id as a string), or 400 "offerId must be an integer".

## Actual
404 "Offer not found or not available" although the offer is active. Nothing changes.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/15-invalid-offer-ids.json`

## Frequency
always

## Regression check
Buy with the id as a string; expect a purchase or a 400 that names the type.

## Hint for developers (optional)
The lookup compares ids strictly (`o.id === offerId`).
