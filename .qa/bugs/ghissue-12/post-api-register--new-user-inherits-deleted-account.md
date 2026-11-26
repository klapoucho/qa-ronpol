---
title: A newly registered user gets a deleted account's user id, with its balance and financial history
area: api/register
severity: critical
kind: security
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: user A (then deleted) and user B, fresh registered users

## Steps to reproduce
1. Register user A, add 12.34 ROL (`POST /financial/transactions`), create a field.
2. A calls `DELETE /api/v1/users/profile` → 200 "Account deleted successfully" (`data.id` 3853).
3. Register user B (a different email) → B's id is 3853.
4. B reads `GET /financial/account` and `GET /financial/transactions`.

## Expected
B is a new account with a new id, 0 ROL and no history. Nothing of A's is visible to anyone.

## Actual
B gets A's id and sees A's account: balance 12.34 and A's income entry ("QA seed funds"). A's own field was removed with the account. In the test writer's runs the next user also received a field A had **bought** and A's marketplace history (offer purchases), so items that came from a sale survive too.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/coordinator/id-reuse-after-delete.json` (A's id and balance before deletion; B's profile, account and transactions)
- Test writer, same run: a fresh seller (id 400) started at 10.10 with a deleted buyer's 15.15 income, 5.05 purchase and offer history; a throwaway user (id 402) received balance 10.1, field 197 and the purchase of offer 271 (reported in the run's struggles, no separate artifact).

## Frequency
3 of 3 (coordinator 1, test writer 2)

## Regression check
`.qa/runs/2026-11-26-issue-12-marketplace-business-rules/scratch/coordinator/id-reuse.mjs`: register, fund, delete, register again; expect a new id and balance 0.

## Hint for developers (optional)
The new id looks like it is derived from the current number of users rather than the highest id ever used. Related: `post-api-marketplace-buy--deleted-account-token-buys.md` (the deleted account's token keeps working, so A's old token and B now act on the same account).

## Impact on test automation
Any test that deletes an account hands its leftovers to whichever test registers next, so in a parallel suite an account-deletion test contaminates other tests. Keep such a test in its own isolated run until this is fixed.

## Re-checks
- Re-checked 2026-11-26 in `2026-11-26-issue-13-marketplace-seller-lists-an-item` (A4): still reproduces and goes further. After `DELETE /users/profile`, the old token still created a field (`POST /fields` → 201, field 1619). The next registered user got the deleted account's id (5707), balance 1.11, that post-deletion field and the deleted account's offer 1582, which was `active` in another user's Browse for a field removed with the account; the new user could cancel it (200). Evidence: `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/A4-deleted-account-token-create.json`, `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/A4-cleanup-sink-cancels-inherited-offer.json`.
