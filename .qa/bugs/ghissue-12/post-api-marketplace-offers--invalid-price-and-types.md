---
title: Create offer refuses price 0 as a "missing field" and accepts malformed price and description values
area: api/marketplace/offers
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller, fresh registered user who owns a field and an animal group

## Steps to reproduce
`POST /api/v1/marketplace/offers` with a valid owned item (`itemType` "field" or "animal") and, one at a time:
1. `price: 0`
2. `price: 1e307`
3. `price: "12abc"`, then `price: [5]`
4. `description: 12345`, `["a","b"]`, `true`
5. `itemId: "abc"`, then `itemId: 1.5`
6. `price: "12,50"`, `"1 000"`, `"1.000,00"`

## Expected
400 with a message that names the field and the rule (issue #12 AC-1: "invalid input is refused with 400 and a message naming the problem"), and nothing stored.

## Actual
1. 400 "Missing required fields: itemType, itemId, price", although all three were sent (`itemId: 0` gets the same). −1 gets the right message, "Price must be greater than 0".
2. 400 "Price must be greater than 0" (wrong reason).
3. **200**, offer stored with price 12 / 5.
4. **200**, `description` stored and returned as a number, an array or a boolean.
5. 404 "Item not found or not owned by user" instead of 400.
6. **200**, stored cut short: 12, 1 and 1. A seller typing a Polish-style price over the API gets a different price than they meant.
The same for both item types. All of these need crafted API input: the Create Offer form blocks prices below 1 before any request.

## Contract
- OpenAPI (`docs/api/openapi.json`): `price` number > 0, `description` string, `itemId` integer.
- Live: as above.
- Who is wrong: the app. Tests: expected failure until fixed.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/A3-price-invalid.json` (cases "price 0", "price 1e307", "price \"12abc\"", "price [5]")
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/A8-description-wrong-type.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/A9-item-type-and-id-invalid.json` (cases "itemId 0", "itemId \"abc\"", "itemId 1.5")
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/R5-price-decimal-comma.json`

## Frequency
always

## Regression check
`POST /marketplace/offers { itemType: "field", itemId: <own field>, price: 0 }` → expect 400 naming the price; `price: "12abc"` → expect 400.
