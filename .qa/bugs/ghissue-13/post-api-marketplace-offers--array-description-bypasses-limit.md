---
title: A description sent as a JSON array gets past the 300-character limit and is stored as an array
area: api/marketplace/offers
severity: minor
kind: contract
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: API (Node fetch with X-Synthetic-Token)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller id 5708 (fresh)

## Steps to reproduce
1. `POST /api/v1/marketplace/offers` with `{ itemType: "field", itemId: <own free field>, price: 2.22, description: ["x" repeated 500 times] }`.

## Expected
400, as for a 301-character string ("Description cannot exceed 300 characters"), or 400 for a wrong type.

## Actual
200. The offer is stored with `description` as an array, and other users' Browse serves it as 500 characters. In the UI the 500-character word runs out of its card and widens the page to 4,071 px (report problem 3).

## Contract
- OpenAPI (`docs/api/openapi.json`): `MarketplaceOfferCreate.description` is `type: string`.
- Live: an array is accepted (200) and stored as an array.
- Who is wrong: the app. Tests: expected failure until fixed.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R4-description-array-bypasses-limit.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R5-my-offers-huge-price-and-array-description.png`

## Frequency
always

## Regression check
`POST /api/v1/marketplace/offers` with `description: ["x"×500]` → expect 400.

## Hint for developers (optional)
Check `typeof description === "string"` before the length check.
