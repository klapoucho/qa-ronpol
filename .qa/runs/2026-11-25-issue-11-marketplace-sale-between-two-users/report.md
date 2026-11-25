# Marketplace: sale between two users (API) — FAIL

**Source:** https://github.com/klapoucho/qa-ronpol/issues/11 (no linked PR) · **Run:** 2026-11-25-issue-11-marketplace-sale-between-two-users · **Env:** http://localhost:3000/api/v1 · **Platforms:** API (Node fetch scripts) · **App version:** Rolnopol 1.126.0 (`GET /api/v1/about`, Docker image `jaktestowac/rolnopol:1.126.0`) · **Date:** 2026-11-25
**Roles tested:** seller (registered user), buyer (registered user), third user (bystander), anonymous caller · **Skipped:** admin — not part of the buy flow; demo accounts — forbidden by QA settings.

On the normal path AC-4 and AC-5 hold:
- A sale moves the exact price, the item (field or animal), the offer status and both histories.
- A refusal changes nothing, checked on 12 read-back surfaces.
- Concurrent buys of one offer produce exactly one sale (4 races).

**The verdict is FAIL** because of what the seller can do around a listing (found by the QA reviewer, ids `R-…`):
- A seller can edit a listed item, so the buyer pays the listed price for something else (R-2). This is an ordinary action.
- A seller who deletes the field while a buy is running takes the buyer's money and delivers nothing (R-1, 5 of 6 tries).
- Any user can attach animals or staff to another user's field, or wipe its staff assignments (R-3, R-4).

The tester's own findings (1–6) are about input handling and the API contract, not the sale.

## Problems (user-facing)

### R-1. Buyer pays and receives nothing when the seller deletes the field during the purchase — major
- **Steps:** 1. Seller creates a field and lists it at 60. 2. Buyer (funded 100) calls `POST /marketplace/buy { offerId }`. 3. Within the ~4 s the buy takes, the seller calls `DELETE /fields/<id>`. 4. Read back the buyer's `/fields`, `/financial/account`, `/marketplace/transactions` and the seller's `my-offers`.
- **Expected:** the buy is refused (404) with nothing charged, or the payment is reversed.
- **Actual:** buy 200 "Purchase completed successfully", delete 200. Buyer 100 → 40 with an expense of 60, seller 0 → 60, offer `sold`, transaction `completed`; the buyer's `/fields` is empty.
- **Frequency:** 5 of 6 tries (delete 0.3, 1.5 or 3 s into the buy).
- **Evidence:** `artifacts/review/E5-race-delete-field-during-buy-round1.json`, `artifacts/review/E5-race-delete-field-during-buy-round2.json`
- **Severity note:** money lost with nothing delivered; both steps are ordinary actions, only the timing has to line up.

### R-2. A listed field or animal can be edited after listing; the buyer pays the listed price for the edited item — major
- **Steps:** 1. Seller creates a field `{ area: 100 }` and lists it at 99 as "Big field 100 ha". 2. Seller calls `PUT /fields/<id> { area: 0.01 }` → 200. 3. Buyer buys the offer. Same with animals: list "Ten cows" at 50, `PUT /animals/<id> { type: rat, amount: 1 }`, buy.
- **Expected:** a listed item is locked, or the offer is withdrawn when the item changes (the app already marks an offer `unavailable` when its item goes "in use").
- **Actual:** both buys succeed at the original price; the buyer gets 0.01 ha for 99 and 1 rat for 50. The offer description still says "Big field 100 ha" / "Ten cows".
- **Frequency:** every try.
- **Evidence:** `artifacts/review/E4-item-edited-after-listing.json`
- **Note:** reproduced over the API; whether the Fields and Animals screens allow the edit while an offer is active was not checked.

### R-3. Any user can attach animals and staff to another user's field, and so block its sale — major
- **Steps:** 1. User B owns field F. 2. A stranger or the former owner calls `POST /animals { type: "rat", amount: 1, fieldId: F }` and `POST /fields/assign { fieldId: F, staffId: <own staff> }`. 3. B calls `POST /marketplace/offers { itemType: "field", itemId: F, price: 20 }`.
- **Expected:** step 2 is refused (403/404), as `PUT /fields/F` by a non-owner already is (404).
- **Actual:** both writes answer 201; B cannot see the foreign animals, but B's listing fails with 400 "Cannot sell field with assigned animals". `fieldId: 999999` is accepted too.
- **Frequency:** every try.
- **Evidence:** `artifacts/review/E3b-non-owner-writes-to-bought-field.json`
- **Severity note:** crafted request with someone else's field id, but a cross-user write; ids are sequential.

### R-4. `DELETE /fields/:id` by a non-owner answers 200 and wipes the owner's staff assignments — major
- **Steps:** 1. Owner O creates field F and assigns staff to it. 2. Stranger T calls `DELETE /fields/F`. 3. O reads `GET /fields` and `GET /fields/assign`.
- **Expected:** 403/404 (as on `PUT`), nothing changes.
- **Actual:** 200 "field deleted"; F stays, but O's assignment on F is gone. A non-existent id also answers 200. After a sale, the former seller holds the id naturally and can do this to the buyer.
- **Frequency:** every try.
- **Evidence:** `artifacts/review/E3c-stranger-deletes-owner-field.json`, `artifacts/review/E3b-non-owner-writes-to-bought-field.json`

### 1. Create offer answers HTTP 200 with `"message": 201` instead of HTTP 201 — minor
- **Steps:** 1. Register a user, `POST /api/v1/fields` `{ "name": "QA field", "area": 3.5 }`. 2. `POST /api/v1/marketplace/offers` `{ "itemType": "field", "itemId": <id>, "price": 5, "description": "QA offer" }`.
- **Expected:** HTTP 201 (OpenAPI says 201), and the envelope `message` is a string, as on other endpoints.
- **Actual:** HTTP 200, body `{ "success": true, "data": { "offer": {…}, "message": "Offer created successfully" }, "message": 201 }`. The status code ends up in the envelope `message` as a number. Cause: the controller passes 201 as the `message` argument of `sendSuccess`.
- **Evidence:** `artifacts/01-happy-buy-response.json` (`seed.offer`), `artifacts/20-latency.json`
- **Severity note:**
  - Every offer creation hits it, but no data is wrong.
  - API clients that check for 201, or for a string `message`, reject a successful create. The framework's own `successEnvelope` does.
  - This is the neighbouring create-offer flow (AC-1), not the buy.

### 2. Malformed JSON body gets 500 "Internal server error" instead of 400 — minor
- **Steps:** `POST /api/v1/marketplace/buy` with `Content-Type: application/json` and a truncated body `{"offerId":`, with or without a token.
- **Expected:** 400 with a message about the invalid body.
- **Actual:** 500 `{ "error": "Internal server error" }`. The same happens on `POST /marketplace/offers`, `/fields` and `/financial/transactions`, so it is app-wide. Nothing changes and no internals leak.
- **Evidence:** `artifacts/15-invalid-offer-ids.json` (`malformedJson`), `artifacts/15b-malformed-json-other-endpoints.json`
- **Severity note:** crafted input only; the UI always sends valid JSON.

### 3. Buy with `offerId` sent as a string answers 404 for an existing active offer — minor
- **Steps:** A funded buyer and an active offer with id N: `POST /api/v1/marketplace/buy` `{ "offerId": "N" }`.
- **Expected:** the offer is bought (cancel, `DELETE /marketplace/offers/N`, accepts the id as a string), or 400 "offerId must be an integer".
- **Actual:** 404 "Offer not found or not available", although the offer is active. Nothing changes. Cause: the lookup compares ids strictly (`o.id === offerId`).
- **Evidence:** `artifacts/15-invalid-offer-ids.json` (`stringId`, `realOfferId`)
- **Severity note:** crafted input only; the Marketplace page sends `parseInt(...)`.

### 4. Invalid token gets 403 instead of 401 — minor
- **Steps:** `POST /api/v1/marketplace/buy` `{ "offerId": N }` with `Authorization: Bearer not-a-token`.
- **Expected:** 401, the same as a request with no token.
- **Actual:** 403 "Invalid or expired token". With no token the answer is 401 "Access token required". Nothing changes.
- **Evidence:** `artifacts/16-buy-without-auth.json`
- **Severity note:** shown only with a crafted token. The message suggests expired tokens get the same 403, but I could not produce an expired, validly signed token.

### R-5. Buyer receives a field holding the seller's animals when the seller adds animals during the purchase — minor
- **Steps:** 1. Seller lists field F at 30. 2. Buyer (funded 100) buys it. 3. About 1.5 s into the buy, the seller calls `POST /animals { type: sheep, amount: 4, fieldId: F }`.
- **Expected:** the buy is refused ("Cannot sell field with assigned animals").
- **Actual:** buy 200; the buyer owns F with the seller's 4 sheep on it and cannot relist F (400).
- **Frequency:** 1 of 1.
- **Evidence:** `artifacts/review/E6-race-animal-on-field-during-buy.json`

### R-6. Seller gets "Offer cancelled successfully" but the offer is sold anyway — minor
- **Steps:** 1. Seller lists a field at 25. 2. Buyer starts `POST /marketplace/buy`. 3. About 1.5 s later the seller calls `DELETE /marketplace/offers/<id>`.
- **Expected:** the cancel fails, or the buy fails.
- **Actual:** cancel 200 "Offer cancelled successfully"; the buy then completes with 200 and the offer ends `sold`.
- **Frequency:** 2 of 2.
- **Evidence:** `artifacts/review/E7-race-cancel-during-buy-round1.json`, `artifacts/review/E7-race-cancel-during-buy-round2.json`

### R-7. After a sale, the seller's staff assignment stays on the buyer's field — minor
- **Steps:** 1. Seller assigns staff to field F. 2. Seller lists F, a buyer buys it. 3. Both read `GET /fields/assign`.
- **Expected:** the assignment is removed when the field changes owner.
- **Actual:** the seller still lists `{ fieldId: F, staffId: <seller's staff> }`; the buyer sees nothing.
- **Frequency:** every try.
- **Evidence:** `artifacts/review/E3-staff-assignment-and-seller-access.json`, `artifacts/review/E3b-non-owner-writes-to-bought-field.json`

### 5. `offerId: 0` is refused as "Missing required field: offerId" — cosmetic
- **Steps:** `POST /api/v1/marketplace/buy` `{ "offerId": 0 }`.
- **Expected:** 404, or 400 naming an invalid id.
- **Actual:** 400 "Missing required field: offerId", although the field is present.
- **Evidence:** `artifacts/15-invalid-offer-ids.json` (`zero`)

### 6. OpenAPI describes the marketplace history differently from the real response — cosmetic
- **Actual vs spec:**
  - `GET /marketplace/transactions` returns `data: { transactions: [...], total }`. The spec says `data` is an array.
  - Each transaction has `createdAt` and `status: "completed"`. The spec requires `timestamp` and has no `status`.
  - `POST /marketplace/offers` returns 200; the spec says 201 (problem 1).
- **Evidence:** `artifacts/05-happy-marketplace-history.json`, `artifacts/01-happy-buy-response.json`; the spec is saved in `scratch/openapi.json`.

## Test cases

| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| 1 | PASS | buyer | script | Funded buyer (200) buys a field offer at 123.45 → 200, transaction `{ offerId, sellerId, buyerId, itemType: field, itemId, price: 123.45, status: completed }` | AC-4 | artifacts/01-happy-buy-response.json |
| 2 | PASS | buyer, seller | script | Exact balances: buyer 200 → 76.55, seller 0 → 123.45 | AC-5 | artifacts/02-happy-balances.json |
| 3 | PASS | buyer, seller | script | The field (same id, name, area) is in the buyer's `GET /fields` and gone from the seller's | AC-5 | artifacts/03-happy-field-owner.json |
| 4 | PASS | seller, buyer, third | script | Offer `active` → `sold` in the seller's my-offers; in the buyer's and third user's browse before, absent after | AC-5 | artifacts/04-happy-offer-status.json |
| 5 | PASS | buyer, seller, third | script | Same marketplace transaction id in the buyer's and seller's history; third user's history empty | AC-5 | artifacts/05-happy-marketplace-history.json |
| 6 | PASS | buyer, seller | script | Financial history, in both `/financial/transactions` and `/financial/account`: buyer `expense 123.45 marketplace "Marketplace purchase"` (200 → 76.55); seller `income 123.45 marketplace "Marketplace sale"` (0 → 123.45) | AC-5 | artifacts/06-happy-financial-history.json |
| 7 | PASS | buyer | script | Balance exactly equal to the price (50.25) → 200; buyer ends at 0, seller at 50.25, offer sold, field moved | AC-4 | artifacts/07-balance-equals-price.json |
| 8 | PASS | buyer | script | Balance 50.24, price 50.25 → 400 "Insufficient funds to complete purchase (no overdraft allowed)"; all 12 read-backs unchanged | AC-4 | artifacts/08-balance-one-cent-below.json |
| 9 | PASS | buyer | script | Balance 0, price 1 → 400 with the same message; nothing changes | AC-4 | artifacts/09-balance-zero.json |
| 10 | PASS | buyer | script | Price 10.555 is stored as 10.56; a buyer with 10.56 buys (ends at 0), a buyer with 10.55 is refused with 400 and nothing changes | assumption (2-decimal money) | artifacts/10-three-decimal-price.json |
| 11 | PASS | seller | script | Funded seller buys own offer → 400 "Cannot buy your own offer"; nothing changes | AC-6 | artifacts/11-buy-own-offer.json |
| 12 | PASS | buyer, buyer 2 | script | Sold offer bought again by the same buyer and by another funded buyer → 404; no second debit or credit, buyer 2 keeps 100 | AC-4 | artifacts/12-buy-sold-offer-again.json |
| 13 | PASS | buyer, buyer 2 | script | Two funded buyers buy one offer concurrently → one 200, one 404; seller credited once, one debit, one owner, offer sold. Repeated 3 more times with 4 parallel requests each: always exactly one 200 | AC-4, AC-5 | artifacts/13-concurrent-two-buyers.json, artifacts/13b-concurrent-repeat.json |
| 14 | PASS | buyer | script | Same buyer sends 3 concurrent buys → 200, 404, 404; debited once (100 → 70) | AC-4 | artifacts/14-concurrent-same-buyer.json |
| 15 | PASS | buyer | script | Non-existent id → 404; missing or null id → 400; negative or object id → 404; nothing changes | assumption (api.md) | artifacts/15-invalid-offer-ids.json |
| 15a | FAIL | buyer | script | String `offerId` of an active offer → 404 (problem 3); `0` → misleading 400 (problem 5) | assumption | artifacts/15-invalid-offer-ids.json |
| 15b | FAIL | buyer, anonymous | script | Malformed JSON → 500 on buy and three other POST endpoints (problem 2) | assumption (api.md) | artifacts/15b-malformed-json-other-endpoints.json |
| 16 | PASS | anonymous | script | No token → 401; nothing changes; the same request with the buyer's token then succeeds | assumption (api.md) | artifacts/16-buy-without-auth.json |
| 16a | FAIL | anonymous | script | Malformed token → 403 instead of 401 (problem 4) | assumption (api.md) | artifacts/16-buy-without-auth.json |
| 17 | PASS | seller, buyer | script | Seller cancels the offer, buyer's buy → 404; nothing changes | AC-7 | artifacts/17-buy-cancelled-offer.json |
| 18 | PASS | seller, buyer | script | After the sale the seller cannot list the field (404); the buyer can, and the seller sees the new offer in browse | AC-1 + AC-5 (user expectation) | artifacts/18-relist-after-sale.json |
| 19 | PASS | seller, buyer | script | Seller deletes the listed field → offer becomes `unavailable`; buy → 404, buyer keeps 50 | user expectation | artifacts/19-buy-after-field-deleted.json |
| 20 | PASS | — | script | Latency: income 2.0 s, buy 4.1 s, field and offer create ~30 ms | n/a (observation) | artifacts/20-latency.json |
| 21 | FAIL | seller | script | Create offer returns 200 with `"message": 201` (problem 1) | AC-1 neighbour / OpenAPI | artifacts/01-happy-buy-response.json |
| R1 | PASS | seller, buyer, third | script (reviewer) | Animal sale end to end: cow ×3 at 40.5, buyer 100 → 59.5, seller 0 → 40.5, animal moved, offer sold, both histories, third user's history empty, marketplace-stats +1 / +40.5 | AC-4, AC-5 | artifacts/review/E1-animal-sale.json |
| R2 | PASS | seller, buyer | script (reviewer) | Listed animal moved onto a field before the buy → 404, offer `unavailable`, nothing paid | AC-4 | artifacts/review/E2-animal-moved-to-field.json |
| R3 | FAIL | seller, buyer | script (reviewer) | Seller deletes the field during an in-flight buy: buyer charged, no field (R-1) | AC-5 | artifacts/review/E5-race-delete-field-during-buy-round1.json, artifacts/review/E5-race-delete-field-during-buy-round2.json |
| R4 | FAIL | seller, buyer | script (reviewer) | Field and animal edited after listing sell at the listed price (R-2) | user expectation | artifacts/review/E4-item-edited-after-listing.json |
| R5 | FAIL | former owner, stranger, buyer | script (reviewer) | Non-owner `POST /animals` and `/fields/assign` onto another user's field → 201; owner's listing refused (R-3) | user expectation (ownership) | artifacts/review/E3b-non-owner-writes-to-bought-field.json |
| R6 | FAIL | stranger, former owner | script (reviewer) | Non-owner `DELETE /fields/:id` → 200, owner's assignments wiped (R-4) | user expectation (ownership) | artifacts/review/E3c-stranger-deletes-owner-field.json |
| R7 | FAIL | seller, buyer | script (reviewer) | Seller adds animals during an in-flight buy: buyer gets an encumbered field (R-5) | AC-5 | artifacts/review/E6-race-animal-on-field-during-buy.json |
| R8 | FAIL | seller, buyer | script (reviewer) | Seller cancels during an in-flight buy: cancel 200, sale completes (R-6) | AC-7 / AC-5 | artifacts/review/E7-race-cancel-during-buy-round1.json, artifacts/review/E7-race-cancel-during-buy-round2.json |
| R9 | FAIL | seller, buyer | script (reviewer) | Seller's staff assignment stays on the buyer's field (R-7) | user expectation | artifacts/review/E3-staff-assignment-and-seller-access.json |
| R10 | PASS | buyer | script (reviewer) | Buyer spends the balance in parallel with a buy (100: buy 80 + expense 50) → buy 200, expense 400, balance 20 | AC-4 | artifacts/review/E8-race-spend-during-buy.json |

## Console
n/a — API-only run.

## Not verified / blocked
- Expired but validly signed token: there was no way to sign one without the app's secret.
- The UI side of a sale: that is T4's scope. Whether the Fields and Animals screens allow editing a listed item (R-2) was not checked.
- A purchase failing in the middle for reasons other than R-1, R-5 and R-6 (for example the credit step failing) cannot be triggered from the API.

## Assumptions
- Money has 2 decimal places. Check 10 relies on the stored, rounded price.
- "The offer is no longer active" means status `sold` in my-offers and absent from browse.
- "Appears in financial history" means one entry with category `marketplace` and the price as the amount.
  - These entries have `referenceId: null`, so they cannot be linked to a specific sale.
  - With fresh users per test there is exactly one such entry per side.
- Status codes for invalid ids, missing auth and malformed bodies follow `testing-rules/api.md`; the requirements do not state them.

## Regression checks of known bugs
- None listed for this area (`.qa/bugs/` is empty).

## Automation
Branch `test/api-marketplace-sale`, PR https://github.com/klapoucho/qa-ronpol/pull/18: `tests/api/marketplace/sale.spec.ts`, one `@critical` API test covering T1 (AC-4 success half, AC-5). New framework parts: `FieldsApi`, `FinancialApi`, `MarketplaceApi`, zod models, `buildField`/`buildOffer`/`buildIncome`, seed fixtures and a `readSale` fixture.
- Gate: typecheck, eslint, prettier, `--list` pass; existing framework tests 6/6.
- Stability: `--repeat-each=10 --workers=4 --retries=0` → 10/10 (23–37 s each, `test.slow()`).
- Poison: wrong buyer remainder, seller buys own offer, buy step skipped, seller expected to hold only the price → each failed on the targeted assertion.
- Fresh-context test review: 6 fixes applied (seller funded with 10, `unavailable` offer status, wider `referenceId`, buy error shown, title, intent card).

## Lessons applied
- Checked each refusal against 12 read-back surfaces, not the status code alone.
- Ran the race check in 1 + 3 rounds before calling the lock reliable.
