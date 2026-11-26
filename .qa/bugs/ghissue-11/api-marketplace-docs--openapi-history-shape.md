---
title: OpenAPI describes the marketplace history and create-offer responses differently from the real API
area: api/marketplace/docs
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
- Role / account: any registered user

## Steps to reproduce
1. `GET /api/v1/marketplace/transactions` after a sale; compare with the OpenAPI spec.
2. `POST /api/v1/marketplace/offers`; compare the status code with the spec.

## Expected
The responses match the spec.

## Actual
History returns `data: { transactions: [...], total }` (spec: `data` is an array); each transaction has `createdAt` and `status: "completed"` (spec: required `timestamp`, no `status`). Create offer returns 200 (spec: 201).

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/05-happy-marketplace-history.json`
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/01-happy-buy-response.json`

## Frequency
always

## Regression check
Compare `/marketplace/transactions` with the spec's schema.
