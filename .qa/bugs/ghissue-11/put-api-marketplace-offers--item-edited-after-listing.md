---
title: A listed field or animal can be edited after listing, so the buyer pays the listed price for a different item
area: api/marketplace/offers
severity: major
kind: functional
status: open
source: "own: 2026-11-25-issue-11-marketplace-sale-between-two-users"
found: 2026-11-25
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and buyer, fresh registered users

## Steps to reproduce
1. Seller creates a field `{ area: 100 }` and lists it at 99 as "Big field 100 ha".
2. Seller calls `PUT /api/v1/fields/<id> { name, area: 0.01 }` → 200.
3. Buyer buys the offer.
4. Same with animals: list `{ type: cow, amount: 10 }` at 50 as "Ten cows", `PUT /api/v1/animals/<id> { type: rat, amount: 1 }`, buy.

## Expected
A listed item is locked against edits, or the offer is withdrawn when the item changes (the app already marks an offer `unavailable` when its item goes "in use").

## Actual
Both buys succeed at the original price: the buyer gets 0.01 ha for 99 and 1 rat for 50. The offer description still says "Big field 100 ha" / "Ten cows".

## Evidence
- `.qa/runs/2026-11-25-issue-11-marketplace-sale-between-two-users/artifacts/review/E4-item-edited-after-listing.json`

## Frequency
always

## Regression check
List a field, `PUT /fields/<id>` with a different area, buy; expect a refusal or a withdrawn offer.

## Re-checks
- Re-checked 2026-11-26 in `2026-11-26-issue-14-marketplace-buyer-buys-an-offer` (U18): still reproduces while the buyer's confirmation modal is open: the seller shrinks a 42 ha field to 0.01 ha and the buyer pays 18.18 for it; the modal names only `field #<id>`. Evidence: `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U18-seller-edits-field-while-modal-open.json`.
