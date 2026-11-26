# Marketplace: business rules for offers and purchases (API) — handoff to the test writer

**Run:** 2026-11-26-issue-12-marketplace-business-rules · **Env:** http://localhost:3000/api/v1 · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Verdict:** PASS WITH FINDINGS — every refusal the story names (AC-1, AC-2, AC-4, AC-6, AC-7) answers the right status and message and changes nothing, for fields and animal groups; findings are around the rules (validation messages and types, a stranger can take an offer down, HTML in field names runs on the offer card).

## Seed recipe
- Scripts (all in `{RUN_DIR}/scratch/`): `lib.mjs` (register, fund, createField — copied from the issue-11 run), `helpers.mjs` (newUser/newField/newAnimal, `createRaw`, `cancel`, `buy`, and the two "nothing changed" readers `createState` and `tradeState`, `judge`), one probe per group: `probe-a.mjs` (AC-1), `a5-fix.mjs` (300/301 Polish), `probe-b.mjs` (AC-2), `probe-cd.mjs` (AC-4, AC-6, transfer), `c5.mjs` (concurrent buys), `probe-e.mjs` (AC-7 + buy input re-checks), `probe-f.mjs` (races and stranger writes), `xss-probe.mjs` / `xss-seed.mjs` / `xss-cleanup.mjs`. Every probe writes one artifact per check and appends to `scratch/probe.log`.
- Roles: seller, buyer, stranger, observer — all fresh users from `POST /register` (the existing `createUser` fixture). Nobody needs an admin.
- Order per case: register → fund (income, non-round amount) → `POST /fields` or `POST /animals` → `POST /marketplace/offers` → the refused call → read back.
- Starting balances used (non-zero, non-round, so "unchanged" and "changed by" are distinguishable): seller 17.43 / 88.88 / 12.34; boundary buyers 50.25 & 50.24 (field at 50.25), 33.33 & 33.32 (animal at 33.33); concurrent buyer 61.17 with two offers at 40.
- Gotchas:
  - Animal group: `POST /animals { "type": "cow", "amount": 3 }` → 201 `data: { userId, type, amount, createdAt, id }`. `type` must be a key from `GET /animals/types` (cow, pig, sheep, goat, duck, rat, …); an unknown type is 400. **There is no `AnimalsApi` client, no animal model/factory yet**, and `MarketplaceApi` has **no `cancel`** — both are needed.
  - Create offer answers **HTTP 200** with `"message": 201` in the envelope (known bug). The existing `createOfferEnvelopeSchema` already handles it; do not assert 201.
  - Income ~2 s per call, buy ~4 s, and buys/incomes share one global ledger lock across all workers. A refusal of a buy (400/404) returns fast because it fails before the money step, but it still waits in the queue behind other workers' buys.
  - An animal placed on a field (`fieldId`) cannot be listed, and a field with any animal on it cannot be listed — create the animal group **without** `fieldId`.

## Verified locators / endpoints
| What | Request | Response / state | Note |
|---|---|---|---|
| Create offer | `POST /marketplace/offers { itemType: "field"\|"animal", itemId, price, description? }` | 200 `data: { offer: { id, sellerId, itemType, itemId, price, description, status: "active", createdAt, updatedAt }, message: "Offer created successfully" }`, top-level `message: 201` | price rounded to 2 dp (10.555 → 10.56, 0.005 → 0.01); missing/null description stored as `""` |
| Create refusals (exact `error`) | — | 400 `"Price must be greater than 0"` (−1, −0.01, 0.001, 0.004, "abc", true, {}); 400 `"Missing required fields: itemType, itemId, price"` (price 0/""/null/missing, itemType missing, itemId missing/0); 400 `"Invalid item type. Must be \"field\" or \"animal\""`; 400 `"Description cannot exceed 300 characters"`; 400 `"Description contains invalid characters"`; 404 `"Item not found or not owned by user"` (other user's item, no such id, −1); 400 `"Item is already offered for sale"`; 400 `"Cannot sell field with assigned animals"`; 400 `"Cannot sell animal assigned to a field"` | error envelope `{ success: false, timestamp, error }` |
| Buy | `POST /marketplace/buy { offerId: <number> }` | 200 `data: { transaction: {...}, message: "Purchase completed successfully" }` | |
| Buy refusals | — | 400 `"Insufficient funds to complete purchase (no overdraft allowed)"`; 400 `"Cannot buy your own offer"` (checked before funds: an unfunded seller gets this one too); 404 `"Offer not found or not available"` (cancelled, sold, unknown) | |
| Cancel | `DELETE /marketplace/offers/{offerId}` | 200 `{ success, timestamp, data: { message: "Offer cancelled successfully" } }` | message is inside `data` (spec: top level) |
| Cancel refusals | — | 403 `"Not authorized to cancel this offer"` (any non-seller, also for a sold offer); 400 `"Offer is not active"` (seller, cancelled/sold/unavailable offer); 404 `"Offer not found"`; 400 `"Invalid offerId format. Must be a positive integer."` ("abc", 0, −1, 1.5); 401 `"Access token required"` | the owner check runs before the status check |
| Offer state | `GET /marketplace/my-offers` → `data.offers[].status` | `active` → `cancelled` / `sold` / `unavailable` | browse (`GET /marketplace/offers`) lists only `active` offers of other users, demo offers included |
| Animals list | `GET /animals` | `data: [ { userId, type, amount, createdAt, id } ]` | |

## Automation candidates
T2 is one parametrized spec (`tests/api/marketplace/rules.spec.ts` + `rules.params.ts`, FR-09). Every refusal case asserts status, exact `error`, and that the "nothing changed" snapshot is equal before and after. Snapshot = seller balance, buyer balance, offer status in seller My Offers, offer present in the other user's browse, item in seller's and buyer's item list (fields or animals), both marketplace histories, both financial histories (what `tradeState` in `helpers.mjs` reads; for create refusals `createState`).

| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| A3 (subset) invalid price × {field, animal} | AC-1 | API | −1, −0.01, 0.004 (rounds to 0), "abc" → 400 `"Price must be greater than 0"`; seller My Offers, observer browse, balance unchanged | A1/A2: the same body with price 12.34 is accepted (200) and shows in both lists |
| A5/A5b description length × {field, animal} | AC-1 | API | 300 chars (ASCII and Polish) accepted and stored byte-equal; 301 → 400 `"Description cannot exceed 300 characters"`, nothing changed | the 300 case passes with the same item |
| A6/A7 description characters × {field, animal} | AC-1 | API | all 18 Polish letters + `. , ; : ! ( ) - _` + digits + tab/newline accepted and stored equal; one representative per disallowed class (`?`, `<`, `'`, `@`, emoji, `é`) → 400 `"Description contains invalid characters"` | same template text with an allowed char is accepted |
| A10 item not owned × {field, animal} | AC-1 | API | 404 `"Item not found or not owned by user"`; both users' lists unchanged | the owner sending the same body gets 200 |
| B1/B2 duplicate offer × {field, animal} | AC-2 | API | second create (different price/description) → 400 `"Item is already offered for sale"`; exactly one active offer for the item | first create 200 |
| C2/C3 one cent below × {field 50.25 vs 50.24, animal 33.33 vs 33.32} | AC-4 | API | 400 `"Insufficient funds to complete purchase (no overdraft allowed)"`; snapshot equal | C1/C3: a buyer with exactly the price buys **the same offer** afterwards (200, buyer 0, seller + price) |
| D1/D2 own offer × {field, animal} | AC-6 | API | seller funded 88.88 > price 20.5 → 400 `"Cannot buy your own offer"`; snapshot equal | another funded user buys the same offer afterwards (200) |
| E1/E2 stranger cancels × {field, animal} | AC-7 | API | 403 `"Not authorized to cancel this offer"`; snapshot equal; offer still `active` and in browse | stranger's token cancels its own offer (200); a buyer can still buy the offer (200) |
| E3 seller cancels × {field, animal} | AC-7 | API | 200; My Offers `cancelled`; gone from another user's browse; buy → 404 `"Offer not found or not available"`; balances and items unchanged | browse read before cancel contains it |
| C1 balance equals price | AC-4 boundary | API | 200; buyer 0, seller 17.43 + 50.25 = 67.68; buyer owns field | pairs with C2 |

### Reviewer's candidates (from `review.md`)

| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| R3b/R3c deleted account's token buys | AC-4 (user expectation) | API | After `DELETE /users/profile`, `POST /marketplace/buy` with the old token → 401; buyer and seller balances, offer `active`, field owner unchanged. Today 200: expected failure, `test.fail()` linked to `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` | the same token buys before deletion; login after deletion → 401 shows the account is really gone |
| R2 old token after logout | AC-1/4/7 (user expectation) | API | `POST /logout`, then the old token on create, buy and cancel → refused (401 per spec; live 403, known invalid-token-403); trade snapshot equal | the same token creates an offer right before logout (200) |
| R8b two buyers, one offer | AC-4 | API | exactly one 200, the other 404 "Offer not found or not available"; seller + price once; payments sum = price | both buyers funded above the price, so funds cannot decide the race. Slow (ledger lock): keep out of the lean set or tag @slow |
| R5 price "12,50" | AC-1 | API | 400, nothing stored (today 200, stored 12): `test.fail()` with `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md` | price 12.5 as a number is accepted and stored 12.5 |
| U1 UI price below 1 | AC-1 (user expectation) | UI | price 0.5 submits and stores 0.5 (today blocked by `min="1"`): expected failure, `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md`. Outside T2's API scope | price 5 from the same form is stored (U3) |

Lean set: one positive control + the refusal per rule, parametrized by item type. A3's other price values, A9 and E4 are useful but secondary.

## Do not automate
- A3 "12abc"/[5]/1e15, A8 non-string descriptions, A9 itemId "abc"/1.5, price 0 message — open findings (see below); if pinned at all, `test.fail()` linked to the bug file.
- B5 concurrent duplicate creates (6/6 rounds kept one active offer) and C5/C5b concurrent buys (no overdraft) — races; deterministic today because of the JSON DB write queue and the ledger lock, but slow and serialising across workers.
- F6/F9 cancel/relist during a buy — timing-dependent, keep as manual repro.
- X2 HTML in field name — security finding, UI-only effect; belongs to a UI/security test after a fix, not to T2.

## Open findings
- HTML in a field name runs in every buyer's Marketplace browse (stored XSS) — not in T2's assertions.
- A stranger takes down any active field offer by `POST /animals { fieldId }`; the seller then gets 400 on cancel and on relist (extends `.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md`). Would break an AC-7 test only if it seeded animals on the field — it does not.
- Price 0 / itemId 0 → `"Missing required fields: itemType, itemId, price"`: if T2 has a "price 0" case, assert the real message only under `test.fail()` or use −1 / 0.004 for the "price must be > 0" message.
- Create accepts `"12abc"` (→ 12), `[5]` (→ 5), and non-string descriptions (12345, ["a","b"], true are stored as is); itemId "abc"/1.5 → 404 not 400.
- Known: create returns 200 + `message: 201`; buy with string offerId → 404; offerId 0 message; malformed JSON 500; invalid token 403.

- Reviewer: a deleted account's old token still buys (`post-api-marketplace-buy--deleted-account-token-buys.md`); an `unavailable` offer can never be cancelled (`delete-api-marketplace-offers--unavailable-offer-stuck.md`) — don't seed animals on a listed field in an AC-7 test; the Create Offer form blocks prices below 1 (`ui-marketplace-create--price-below-one-refused.md`).
- Price 0 is API-only: the UI form blocks it before any request (reviewer U1).

## Traps
- Compare `price`/balances as numbers rounded to 2 dp: `5.55 + 6.66 + 40 !== 45.55 + 6.66` in JS (this run's first C5 verdict was a false FAIL because of it).
- Polish 300-char string: `'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'` is 18 letters — build the 300 with `.repeat(17).slice(0, 300)`; this run's first attempt sent 318 and looked like a bug.
- The "nothing changed" snapshot must include financial and marketplace histories, not only balances: a refused buy that debited and reversed would leave balances equal but add two history entries.
- Browse contains demo users' and other agents' offers; filter by offer id or seller id, never by list length.
- My Offers keeps cancelled/sold offers; filter by `status === 'active'` when counting active offers for an item (AC-2).
- The owner check on cancel comes before the status check: a stranger gets 403 even on a sold or cancelled offer, the seller gets 400.
- Own-offer is checked before funds: to make AC-6 isolate "own", fund the seller above the price anyway (otherwise a reader cannot tell which rule fired from the setup).
