---
title: An offer marked unavailable never comes back and cannot be withdrawn, so My Offers keeps a dead offer
area: api/marketplace/offers
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller, fresh registered user

## Steps to reproduce
1. The seller lists field F.
2. The seller adds an animal on F (`POST /animals { fieldId: F }`): the offer turns `unavailable` and leaves browse.
3. The seller deletes the animal.
4. The seller calls `DELETE /marketplace/offers/{id}`, then lists F again.

## Expected
Once the item is free, the offer becomes `active` again, or the seller can withdraw it.

## Actual
It stays `unavailable` for good. Cancel → 400 "Offer is not active", and the UI's Cancel button is disabled. Listing again works, so My Offers holds two offers for one field (one `unavailable`, one `active`), and the dead one cannot be removed. With a stranger's animal (`.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md`) the same mechanism blocks the seller completely.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/R7-own-animal-on-own-listed-field.json`

## Frequency
always

## Regression check
Steps above; expect cancel 200 (or the offer back to `active`) after the animal is removed.
