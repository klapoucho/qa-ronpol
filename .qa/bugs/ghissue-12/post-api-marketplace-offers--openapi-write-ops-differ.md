---
title: OpenAPI describes the Marketplace create, cancel and buy operations differently from the live API
area: api/marketplace/offers
severity: minor
kind: contract
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller, buyer, anonymous

## Steps to reproduce
Compare `docs/api/openapi.json` with live answers of:
1. `POST /marketplace/offers` (valid, no token, invalid token).
2. `DELETE /marketplace/offers/{offerId}` (valid, `abc`, already cancelled, no token).
3. `POST /marketplace/buy` (no token, invalid token, malformed JSON).
4. My Offers after a stranger attaches an animal to a listed field.

## Expected
Every status and body shape the app serves is documented, and the app answers what the spec promises.

## Actual
- `POST /marketplace/offers`: 200 instead of the documented 201 (known: `.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md`); 401 and 403 not documented; `description` can be a non-string (`post-api-marketplace-offers--invalid-price-and-types.md`).
- `DELETE /marketplace/offers/{offerId}`: 400 ("Offer is not active", "Invalid offerId format…") and 401 not documented; the success body has `message` inside `data`, the spec puts it at the top level.
- `POST /marketplace/buy`: 401, 403 and 500 (malformed JSON) not documented.
- `MarketplaceOffer.status`: the enum is `active | cancelled | sold`, but the app also serves `unavailable`.

## Contract
- OpenAPI: as quoted above.
- Live: as above.
- Who is wrong: the docs for the undocumented 400/401, the cancel body shape and `unavailable`; the app for the 200, the 500 and the non-string description. Tests: assert the live behaviour for the documented-gap cases; expected failure for the app-side ones.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/A1-create-valid-field.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/A12-auth-and-malformed.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/E3-seller-cancels-field-offer.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/E4b-cancel-id-and-auth-cases.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/F2-F5-buy-input-rechecks.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/F8-stranger-animal-on-seller-field.json`

## Frequency
always

## Regression check
Send the requests above and compare with `docs/api/openapi.json`; `npm run coverage:api` lists which documented statuses the suite covers.
