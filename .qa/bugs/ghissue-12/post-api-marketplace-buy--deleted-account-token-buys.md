---
title: A deleted account's old token can still buy, so money leaves the deleted account and the item moves into it
area: api/marketplace/buy
severity: major
kind: security
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer D (then deleted) and seller E, fresh registered users

## Steps to reproduce
1. Register user D and add 15.15 ROL.
2. User E lists a field at 5.05.
3. D calls `DELETE /api/v1/users/profile` → 200 "Account deleted successfully". `POST /login` with D's credentials → 401; `GET /users/profile` with D's token → 404 "User not found".
4. With the same old token, D calls `POST /api/v1/marketplace/buy { offerId }`.

## Expected
The token of a deleted account is refused everywhere (401), as it is after logout. Nobody can trade on behalf of an account that no longer exists.

## Actual
Buy → 200 "Purchase completed successfully". D's balance goes 15.15 → 10.10, E receives 5.05 and the offer is `sold`. The field moves to the deleted account (`GET /fields` with the old token lists it), where nobody can sign in to use it. The token also still reads `/marketplace/offers`, `/marketplace/my-offers` and `/financial/account` (200). Only create offer answers 400 "User not found".

## Related
- `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`: the next registered user takes over the deleted account's id, so the old token and the new user act on the same account. A test for this case must run isolated.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/R3b-deleted-account-token.json`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/R3c-deleted-account-token-buys-repeat.json`

## Frequency
2 of 2 attempts

## Regression check
Register, fund, `DELETE /users/profile`, then `POST /marketplace/buy` with the old token → expect 401 and nothing changed.

## Re-checks
- Re-checked 2026-11-26 in `2026-11-26-issue-13-marketplace-seller-lists-an-item` (A4): a deleted account's token is refused on `POST /marketplace/offers` (400 "User not found"), but `POST /fields` still answers 201 with it. Evidence: `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/A4-deleted-account-token-create.json`.
