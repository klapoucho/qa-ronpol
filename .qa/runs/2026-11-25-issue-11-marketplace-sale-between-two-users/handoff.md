# Marketplace: sale between two users (API) — handoff to the test writer

**Run:** 2026-11-25-issue-11-marketplace-sale-between-two-users · **Env:** http://localhost:3000/api/v1 · **App version:** Rolnopol 1.126.0 · **Verdict:** PASS WITH FINDINGS (AC-4/AC-5 pass; findings are around the endpoint, not in the sale)

## Seed recipe
- Scripts: `scratch/lib.mjs` (register, fund, createField, createOffer, buy, snapshot of every AC-5 surface), `scratch/probe.mjs` (all checks; `node probe.mjs happy` runs the T1 scenario), `scratch/concurrent-repeat.mjs` (race), `scratch/timing.mjs` (latency).
- Roles: seller and buyer are two fresh users from the existing `createUser` fixture (`src/fixtures/api.fixtures.ts`, `POST /register`). The seller needs no funds (balance 0 is fine; the sale credits an existing account).
- Order: register seller + buyer → `POST /fields` (seller) → `POST /financial/transactions` income (buyer) → `POST /marketplace/offers` (seller) → `POST /marketplace/buy` (buyer).
- Gotchas:
  - Income needs `cardNumber` (Luhn-valid, 13–20 digits) and `cvv` (3–4 digits); a published test card number works. Amount: max 2 decimals (`^\d+(\.\d{1,2})?$`); description 3–100 chars from `[\w\s.,;:!()\-]` + Polish letters; category optional, `^[A-Za-z0-9][A-Za-z0-9 _-]{0,29}$`.
  - `displayedName` 3–20 chars (the existing `buildUser` already satisfies it).
  - Offer description: same character set, ≤ 300 chars.
  - **Create offer answers HTTP 200, not 201, with `"message": 201` (a number) in the envelope.** The framework's `successEnvelope` has `message: z.string().optional()`, so `BaseApi` will treat the successful create as *not ok* (`ok: false`, `data` throws). The marketplace client must handle this (e.g. allow a number for `message`, or not route this call through the strict envelope) — do not assert 201.

## What exists in `src/` and what is missing
- Exists: `BaseApi` (envelope unwrap, zod schema per call), `ApiResponse`, `AuthApi.register/login`, `UsersApi.profile`, `createUser` + `apiAs` fixtures, `buildUser` factory, `uniqueId`.
- Missing (needed for T1): `FieldsApi` (`list`, `create`), `FinancialApi` (`account`, `transactions`, `addIncome`), `MarketplaceApi` (`createOffer`, `buy`, `myOffers`, `offers`, `transactions`, `cancel`), zod models for field, offer, marketplace transaction, financial account/transaction; factories `buildField` and `buildOffer`; a seed helper "funded user" / "user with a listed field".

## Verified locators / endpoints
| What | Locator / request | Response / state | Note |
|---|---|---|---|
| Create field | `POST /api/v1/fields` `{ "name": "QA field 9b06bb", "area": 3.5 }` | 201 `data: { userId, name, area, id }`, `message: "field added"` | ~30 ms |
| Fund | `POST /api/v1/financial/transactions` `{ type: "income", amount: 200, description: "QA seed funds", category: "seed", cardNumber, cvv }` | 201 `data.transaction: { id, type, amount, description, category, referenceId: null, timestamp, balanceBefore, balanceAfter }` | ~2.0 s per call |
| Create offer | `POST /api/v1/marketplace/offers` `{ itemType: "field", itemId, price: 123.45, description: "QA offer" }` | **200** `data.offer: { id, sellerId, itemType, itemId, price, description, status: "active", createdAt, updatedAt }`, `data.message`, top-level `message: 201` | price rounded to 2 decimals (10.555 → 10.56) |
| Buy | `POST /api/v1/marketplace/buy` `{ offerId: <number> }` | 200 `data: { transaction: { id, offerId, sellerId, buyerId, itemType, itemId, price, status: "completed", createdAt }, message: "Purchase completed successfully" }` | ~4.1 s; `offerId` must be a JSON number |
| Balance | `GET /api/v1/financial/account` | `data.account: { id, userId, balance, currency: "ROL", createdAt, updatedAt, transactions: [...] }` | |
| Financial history | `GET /api/v1/financial/transactions?limit=100` | `data: { transactions: [...], total, limit, offset, hasMore }`, newest first | sale entries: buyer `{ type: "expense", category: "marketplace", description: "Marketplace purchase", amount: price }`, seller `{ type: "income", category: "marketplace", description: "Marketplace sale" }`; `referenceId: null` |
| Marketplace history | `GET /api/v1/marketplace/transactions` | `data: { transactions: [<same object as buy response>], total }` | spec wrongly says `data` is an array |
| Field list | `GET /api/v1/fields` | `data: [ { userId, name, area, id } ]` (bare array in the envelope) | |
| My offers | `GET /api/v1/marketplace/my-offers` | `data: { offers: [ {...offer, details: { name, area }, sellerLabel } ], total }` | sold offers stay here with `status: "sold"` |
| Browse | `GET /api/v1/marketplace/offers` | `data: { offers: [...active offers of others, incl. demo seed offers], total }` | contains demo offers; find yours by id |
| Refusals | buy | insufficient: 400 `"Insufficient funds to complete purchase (no overdraft allowed)"`; own: 400 `"Cannot buy your own offer"`; sold/cancelled/unknown/unavailable: 404 `"Offer not found or not available"`; missing/null/0: 400 `"Missing required field: offerId"`; no token: 401 `"Access token required"`; bad token: 403 `"Invalid or expired token"` | error envelope `{ success: false, timestamp, error }` |

## Automation candidates
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| 1–6 (T1, the issue's test) | AC-4, AC-5 | API | Price 123.45, buyer funded 200: buy 200 with transaction `{ offerId, sellerId, buyerId, itemType: "field", itemId, price: 123.45, status: "completed" }`; buyer balance 76.55, seller 123.45; field id in buyer's `/fields` and not in seller's; offer `sold` in seller my-offers and absent from buyer browse; the same transaction id is the only entry in both marketplace histories; buyer has one `expense 123.45 marketplace`, seller one `income 123.45 marketplace` | Read every surface **before** the buy too (field owned by seller, offer active and in buyer browse, histories empty) so each "after" value is a change, not a seed default. A decimal price catches rounding/int truncation; a non-zero buyer remainder catches "balance set to 0". Use an unfunded seller so the seller value can only come from the sale |
| 7 | AC-4 boundary | API | Balance = price (50.25) → 200, buyer 0 | pairs with 8 |
| 8 | AC-4 (T2 "insufficient funds" case) | API | Balance 50.24, price 50.25 → 400 with the exact message; both balances, both field lists, offer status `active`, both histories unchanged | the 7/8 pair isolates the one-cent boundary |
| 11 | AC-6 (T2 "own offer" case) | API | 400 `"Cannot buy your own offer"`, nothing changes | seller funded ≥ price, so funds cannot explain the refusal |
| 12 | AC-4 (offer must be active) | API | Second buy of a sold offer by another funded buyer → 404, that buyer's balance unchanged, seller credited once | — |

T1 is checks 1–6 in one test (one business behaviour with its outcome, NFR-11). 7, 8, 11, 12 fit T2's parametrized business rules; listed here so T2 does not rediscover them.

## Do not automate
- 13/14 concurrency — deterministic now (global ledger lock), but each buy takes ~4 s and serialises across all workers; a race test would slow every parallel run. Covered manually 4×.
- 15/15a/15b/16a input-handling and status-code findings — bugs, not behaviours to pin; would need `test.fail()` and they are outside T1.
- 18/19 user expectations — outside T1/T2 scope; record only.
- 20 latency — observation.

## Open findings
- Create offer returns 200 + `"message": 201` — touches every T1 seed. Do not assert 201; make the client accept the real response.
- Malformed JSON → 500; string `offerId` → 404; bad token → 403; `offerId: 0` message; OpenAPI shape of marketplace history — none touch the T1 assertions.

## Traps
- **Latency:** income ~2 s, buy ~4 s (JSON DB write debounce). One T1 test ≈ 8–10 s alone. The ledger lock is global, so with 4 workers × `--repeat-each=10` buys queue behind each other; watch the 30 s test timeout and give the buy call enough time.
- **Financial history order:** newest first; compare by filtering `category === "marketplace"`, not by index. Compare `amount` as numbers (123.45), not strings.
- **Browse contains demo users' offers** (ids 1, 3, 4, …): assert on your offer id only, never on list length.
- **Linking finance to the sale:** financial entries have `referenceId: null`; identify them by fresh user + category `marketplace` + amount.
- **IDs are numbers in JSON**; send `offerId` as a number (a string gets 404).
- `/fields` field objects carry `userId` — assert the field is in the buyer's list (by id, name, area), not just `userId`.

## Candidates added by the QA reviewer
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| R1 animal sale | AC-4, AC-5 | API (T2, parametrise the item type) | Cow x3 listed at 40.5, buyer funded 100: buy 200 with `itemType: "animal"`; buyer 59.5, seller 40.5; the animal id, type and amount are in the buyer's `/animals` and not in the seller's; offer `sold`; same transaction in both histories | Read the before state; use an unfunded seller; check the third user's history is empty |
| R4 edit after listing (bug R-2) | user expectation | API, `test.fail()` until fixed | After `PUT /fields/:id {area: 0.01}` on a listed field, the buy should be refused or the offer withdrawn. Today: 200, and the buyer gets 0.01 ha | Browse details read before and after the edit |
| R5/R6 non-owner writes (bugs R-3, R-4) | user expectation (ownership) | API, `test.fail()` until fixed | A stranger's `POST /animals {fieldId: <other user's field>}` and `DELETE /fields/:id` should be 403/404 with the owner's assignments unchanged. Today: 201, and 200 with the assignments wiped | `PUT /fields/:id` by the same stranger → 404 (shows the token and id are right) |
| R3 delete during buy (bug R-1) | AC-5 | do not automate yet | Timing-dependent (5 of 6, ~4 s window) and serialised by the global ledger lock; keep it as a manual repro in the bug file | — |

Scope note from the coordinator: issue 11 is T1 (the happy-path sale). The reviewer's candidates belong to T2 or to separate bug-tracking tests; write T1 only unless a candidate is needed to make T1 meaningful.
