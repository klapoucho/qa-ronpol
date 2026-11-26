---
title: Create offer answers HTTP 200 with "message": 201 instead of HTTP 201
area: api/marketplace/offers
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
- Role / account: seller, fresh registered user

## Steps to reproduce
1. `POST /api/v1/fields { "name": "QA field", "area": 3.5 }`.
2. `POST /api/v1/marketplace/offers { "itemType": "field", "itemId": <id>, "price": 5, "description": "QA offer" }`.

## Expected
HTTP 201 (as the OpenAPI spec says) and a string `message` in the envelope, as on other endpoints.

## Actual
HTTP 200 with `{ success: true, data: { offer, message: "Offer created successfully" }, message: 201 }`. Clients that check for 201 or a string `message` reject a successful create.

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/01-happy-buy-response.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/20-latency.json`

## Frequency
always

## Regression check
Create an offer and check the status code and the envelope `message`.

## Hint for developers (optional)
The controller passes 201 as the `message` argument of `sendSuccess`.
