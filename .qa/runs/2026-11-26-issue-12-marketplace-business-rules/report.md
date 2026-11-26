# Marketplace: business rules for offers and purchases (API) — FAIL

**Source:** https://github.com/klapoucho/qa-ronpol/issues/12 (no linked PR) · **Run:** 2026-11-26-issue-12-marketplace-business-rules · **Env:** http://localhost:3000/api/v1 · **Platforms:** API (Node fetch with `X-Synthetic-Token`); one UI confirmation in Chromium (playwright-cli) · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`; service and controller source identical to the copy in the issue-11 run) · **Date:** 2026-11-26
**Roles tested:** registered user as seller, buyer, stranger, observer (fresh accounts) · **Skipped:** admin (no admin rule in the story); demo accounts (QA settings forbid them)

Every rule the story names holds for both item types (field and animal group). Each refusal has the stated status and an exact message. Afterwards, both balances, the offer's status, whether it shows in another user's browse, who owns the item, and both users' marketplace and financial histories are unchanged. The one-cent-short buyer is refused, and then a buyer holding exactly the price buys that same offer. The verdict is FAIL because of the problems around those rules: two contradict AC-7 directly (problems 3 and 4), a deleted account can still buy (problem 5, found by the reviewer), and a field name runs as script on the offer card (problem 2). The reviewer confirmed the tester's coverage (GAPS CLOSED, `review.md`) and added the UI create form and the session lifecycle.

## Problems (user-facing)

### 1. A newly registered user gets a deleted account's user id, with its balance and financial history — critical (security, found by the test writer)
- **Steps:**
  1. Register user A, add 12.34 ROL, create a field.
  2. A calls `DELETE /api/v1/users/profile` → 200 (id 3853).
  3. Register user B with a different email → B's id is 3853.
  4. B reads `GET /financial/account` and `GET /financial/transactions`.
- **Expected:** B is a new account: new id, 0 ROL, no history.
- **Actual:** B sees A's balance (12.34) and A's income entry. A's own field was removed, but in the test writer's runs the next user also received a field A had bought and A's marketplace history. 3 of 3 (coordinator 1, writer 2).
- **Evidence:** `artifacts/coordinator/id-reuse-after-delete.json` (repro: `scratch/coordinator/id-reuse.mjs`)
- **Bug file:** `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`
- Outside this story's rules (account deletion), but it decides how the deleted-account test can be automated: an account deletion in a parallel suite hands its leftovers to the next test that registers.

### 2. A field's name is rendered as HTML on the Marketplace offer card, so a seller can run script in every buyer's browser — major (security)
- **Steps:**
  1. Seller: `POST /api/v1/fields { "name": "QA<img src=x onerror=\"document.title='QA-XSS-FIRED'\">", "area": 2.5 }` → 201 (name stored as sent).
  2. Seller lists it: `POST /api/v1/marketplace/offers { itemType: "field", itemId, price: 3.21 }`.
  3. Any other user logs in and opens Marketplace → Browse Offers (filtered to the offer).
- **Expected:** the field name shows as text. The AC-1 description whitelist exists to keep markup off this card; the other texts on the card need the same protection (validation or escaping).
- **Actual:** the `<img>` is inserted into the card and its `onerror` runs in the buyer's session (the page title became `QA-XSS-FIRED`). `PUT /fields/{id}` also accepts HTML names (`<b>bold</b>` → 200), so a field can be changed after it is listed. Animal types are a whitelist and display names are validated, so the field name is the only open text found.
- **Evidence:**
  - `artifacts/X1-html-in-other-offer-card-fields.json`
  - `artifacts/X2-seed-html-field-name-offer.json`
  - `artifacts/X2-buyer-browse-dom.json` (title and card HTML)
  - `artifacts/X2-html-field-name-executes-in-browse.png` (broken-image icon after "QA" in "Field: QA…")
  - `artifacts/console-04-marketplace-filtered.txt` (the payload's 404 for `/x`)
  - The offer was cancelled afterwards (`scratch/xss-cleanup.mjs`).
- **Env/role:** Chromium via playwright-cli, 1366×768; buyer is a fresh user.
- **Bug file:** `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`
- **Hint (optional):** `public/js/pages/marketplace.js` builds the card from template strings into `innerHTML` (`details.name`, `details.type`, `sellerLabel`, `description`).

### 3. Any user can take down another user's active field offer, and the seller can then neither cancel nor relist it — major (AC-7, extends a known bug)
- **Steps:**
  1. Seller lists field F (`active`, visible in an observer's browse).
  2. A stranger calls `POST /api/v1/animals { type: "rat", amount: 1, fieldId: F }` → 201.
  3. The observer reads browse, the seller reads My Offers, then the seller tries `DELETE /marketplace/offers/{id}` and tries to list F again.
- **Expected:** AC-7 says only the seller can withdraw an active offer. The stranger's write should be refused (403/404), as `PUT /fields/F` by a non-owner already is.
- **Actual:**
  - The offer disappears from browse and turns `unavailable` in the seller's My Offers.
  - The seller's cancel answers 400 "Offer is not active".
  - Relisting answers 400 "Cannot sell field with assigned animals", although the seller's own `/animals` is empty, so the seller can neither see nor remove the cause.
  - On a field that is not listed yet, the same write blocks the first listing.
- **Evidence:** `artifacts/F8-stranger-animal-on-seller-field.json`, `artifacts/review/R9-stranger-animal-blocks-relist.json` (reviewer: the relist of the listed field is refused)
- **Hint (optional):** this is a new consequence of `.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md`. The `unavailable` status is missing from the OpenAPI enum (see problem 9).
- **Bug file:** `.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md` (this run added the consequence).

### 4. An offer the seller cancelled during a purchase is still sold — major (known bug, contradicts AC-7: "a cancelled offer cannot be bought")
- **Steps:** the seller lists a field at 25.25. A buyer funded with 66.66 starts `POST /marketplace/buy`. 0.8 s or 1.5 s later the seller calls `DELETE /marketplace/offers/{id}`.
- **Expected:** either the cancel or the buy is refused.
- **Actual:** the cancel answers 200 "Offer cancelled successfully", then the buy answers 200. The offer ends `sold`, the field belongs to the buyer and the money has moved. This happened in 2 of 2 rounds.
- **Evidence:** `artifacts/F6-cancel-during-buy.json`
- **Severity note:** the bug file rates this minor. A seller cancelling while somebody buys needs no crafted input, and the seller is told the opposite of what happened, so it is raised to **major**.
- **Bug file:** `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md`

### 5. A deleted account's old token can still buy: money leaves the deleted account and the item moves into it — major (security, reviewer R3b/R3c)
- **Steps:**
  1. Register user D, add 15.15 ROL. User E lists a field at 5.05.
  2. D calls `DELETE /api/v1/users/profile` → 200. Login with D's credentials → 401; `GET /users/profile` with D's token → 404.
  3. With the same old token, D calls `POST /api/v1/marketplace/buy { offerId }`.
- **Expected:** a deleted account's token is refused everywhere (401), as after logout (R2).
- **Actual:** buy → 200. D's balance 15.15 → 10.10, E receives 5.05, the offer is `sold` and the field belongs to the deleted account, which nobody can sign in to. The token still reads offers and the financial account. 2 of 2 attempts.
- **Evidence:** `artifacts/review/R3b-deleted-account-token.json`, `artifacts/review/R3c-deleted-account-token-buys-repeat.json`
- **Bug file:** `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md`

### 6. Create offer: price 0 is refused as a missing field, and malformed values are accepted — minor
- **Steps / Actual** (`POST /marketplace/offers`, the same for fields and animals):
  - `price: 0` → 400 "Missing required fields: itemType, itemId, price", although all three fields were sent. `itemId: 0` gets the same message. AC-1 asks for a message that names the problem, such as "Price must be greater than 0", which −1 gets.
  - `price: 1e307` → 400 "Price must be greater than 0" (wrong reason).
  - `price: "12abc"` → **200**, stored as 12. `price: [5]` → **200**, stored as 5.
  - `description: 12345`, `["a","b"]` or `true` → **200**, stored and returned as a number, an array or a boolean. The contract says string, and the frontend's filter calls string methods on it.
  - `price: "12,50"` → **200**, stored as 12; `"1 000"` and `"1.000,00"` → stored as 1 (reviewer R5).
  - `itemId: "abc"` or `1.5` → 404 "Item not found or not owned by user" instead of 400 for invalid input.
- **Expected:** 400 with a message naming the field and the rule, and nothing stored.
- **Evidence:** `artifacts/A3-price-invalid.json` (cases "price 0", "price \"12abc\"", "price [5]", "price 1e307"), `artifacts/A8-description-wrong-type.json`, `artifacts/A9-item-type-and-id-invalid.json` (cases "itemId 0", "itemId \"abc\"", "itemId 1.5"), `artifacts/review/R5-price-decimal-comma.json`
- All of these need crafted API input: the Create Offer form blocks any price below 1 before a request is sent (reviewer correction; see problem 7).
- **Bug file:** `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md`

### 7. The Create Offer form refuses any price below 1 ROL, although AC-1 and the API allow anything above 0 — minor (reviewer U1)
- **Steps:** Marketplace → Create Offer → Field → pick a field → price `0.5` → Create Offer.
- **Expected:** the offer is created at 0.5 (AC-1: "price greater than 0"; the API accepts 0.01).
- **Actual:** the browser blocks the submit with "Value must be greater than or equal to 1." (`min="1"`). No request is sent. The form's own JS message says "greater than 0".
- **Evidence:** `artifacts/review/U1-ui-price-0.5-blocked.png`, `artifacts/review/U1-U3-ui-offers-read-back.json`
- **Env/role:** Chromium via playwright-cli 1280×720, fresh user.
- **Bug file:** `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md`

### 8. An offer marked unavailable never comes back and cannot be withdrawn — minor (UX, reviewer R7)
- **Steps:** the seller lists field F, adds an animal on F (offer turns `unavailable`), deletes the animal, tries to cancel, lists F again.
- **Expected:** the offer is `active` again once the item is free, or the seller can withdraw it.
- **Actual:** it stays `unavailable`; cancel → 400 "Offer is not active" and the UI's Cancel button is disabled. The relist works, so My Offers shows a dead offer next to the live one for the same field.
- **Evidence:** `artifacts/review/R7-own-animal-on-own-listed-field.json`
- **Bug file:** `.qa/bugs/ghissue-12/delete-api-marketplace-offers--unavailable-offer-stuck.md`

### 9. OpenAPI and the live API differ for the three write operations — minor (contract)
- **`POST /marketplace/offers`:** answers 200 instead of 201 (known bug). It serves 401 and 403, which are not documented, and can return `description` as a non-string (see problem 6).
- **`DELETE /marketplace/offers/{offerId}`:** serves 400 ("Offer is not active", "Invalid offerId format…") and 401, neither documented. The success body has `message` inside `data`, while the spec puts it at the top level.
- **`POST /marketplace/buy`:** 401, 403 and 500 (malformed JSON) are not documented.
- **`MarketplaceOffer.status`:** the enum is `active | cancelled | sold`, but the app also serves `unavailable` (F8).
- **Who is wrong:** the docs for the undocumented 400/401 and the cancel body shape; the app for the 200, the 500 and the non-string description.
- **Bug file:** `.qa/bugs/ghissue-12/post-api-marketplace-offers--openapi-write-ops-differ.md`
- **Evidence:** `artifacts/A1-create-valid-field.json`, `artifacts/A12-auth-and-malformed.json`, `artifacts/E4b-cancel-id-and-auth-cases.json`, `artifacts/E3-seller-cancels-field-offer.json`, `artifacts/F2-F5-buy-input-rechecks.json`, `scratch/openapi.json`

## Test cases
Per-case lines are in `artifacts/probe-log.txt`. Each JSON artifact holds one entry per case, with the request, the response, the state before and after, and the verdict.

| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| A1 | PASS | seller, observer | API | Valid field offer stored with every field, `active` in My Offers and in the observer's browse (HTTP 200, see problem 9) | AC-1 | artifacts/A1-create-valid-field.json |
| A2 | PASS | seller, observer | API | Same for an animal group | AC-1 | artifacts/A2-create-valid-animal.json |
| A3 | FAIL (24/32 pass) | seller | API | Invalid price × 2 types: −1, −0.01, 0.001, 0.004, "abc", "", null, missing, true, {}, "Infinity" refused with nothing changed. Failing: 0 (message), "12abc", [5]. 1e15 accepted (no maximum in the requirements, so recorded only, not a finding); 1e307 refused with the wrong message (problem 6) | AC-1 | artifacts/A3-price-invalid.json |
| A4 | PASS | seller, observer | API | 0.01, 0.005→0.01, 10.555→10.56, 99999999.99 and "5"→5 accepted and stored, both types | AC-1 | artifacts/A4-price-accepted.json |
| A5 | PASS | seller, observer | API | 300-character descriptions (ASCII and Polish letters) accepted and stored unchanged. 301 (ASCII, Polish) and 1000 → 400 "Description cannot exceed 300 characters", nothing changed, both types | AC-1 | artifacts/A5b-description-300-301-polish.json, artifacts/A5-description-length-accepted.json (ASCII, 1 char), artifacts/A5-description-length-refused.json (ASCII 301, 1000) |
| A6 | PASS | seller, observer | API | All 18 Polish letters, each of `. , ; : ! ( ) - _`, all of them together, digits, tab and newline accepted and stored unchanged, both types (26 cases) | AC-1 | artifacts/A6-description-allowed-chars.json |
| A7 | PASS | seller | API | 23 disallowed ASCII symbols, emoji, é/ü/ß, Cyrillic, CJK, Arabic, an XSS payload, an SQL payload, `&amp;`, a bad character at position 300 and an object → 400 "Description contains invalid characters", nothing changed, both types (66 cases) | AC-1 | artifacts/A7-description-disallowed-chars.json |
| A8 | PASS | seller, observer | API | Description "", missing or null is stored as ""; whitespace-only, U+00A0 and U+2028 are accepted as whitespace | AC-1 | artifacts/A8-description-optional.json |
| A8b | FAIL | seller | API | Non-string description (number, array, boolean) accepted and stored as is | AC-1 / contract | artifacts/A8-description-wrong-type.json |
| A9 | FAIL (14/18 pass) | seller | API | itemType missing / "Field" / "tractor" and itemId missing / 0 / −1 / 99999999 refused with nothing changed. Failing: itemId "abc" and 1.5 → 404 instead of 400 | AC-1 | artifacts/A9-item-type-and-id-invalid.json |
| A10 | PASS | seller, other | API | Another user's field and animal group → 404 "Item not found or not owned by user", both users unchanged. Control: the owner's identical request → 200 | AC-1 | artifacts/A10-item-not-owned.json |
| A11 | PASS | seller | API | Field with animals → 400 "Cannot sell field with assigned animals". Animal on a field → 400 "Cannot sell animal assigned to a field" | assumption | artifacts/A11-item-in-use.json |
| A12 | PASS (known bugs) | anonymous, seller | API | No token 401. Invalid token 403 (known bug). Malformed JSON 500 (known bug). No offer created | AC-1 | artifacts/A12-auth-and-malformed.json |
| B1 | PASS | seller, observer | API | Duplicate field offer (same values, different price and description, itemId as a string) → 400 "Item is already offered for sale", exactly one active offer, nothing changed | AC-2 | artifacts/B1-duplicate-field.json |
| B2 | PASS | seller, observer | API | Same for an animal group | AC-2 | artifacts/B2-duplicate-animal.json |
| B3 | PASS | seller | API | After the seller cancels, the item can be listed again with one active offer (field and animal) | assumption | artifacts/B3-relist-after-cancel-field.json, artifacts/B3-relist-after-cancel-animal.json |
| B4 | PASS | seller | API | One user's field 133 and animal group 133 can both be listed (the rule is per item, not per id) | AC-2 | artifacts/B4-same-id-field-and-animal.json |
| B5 | PASS | seller | API | Two concurrent creates for one item, 3 rounds × 2 types → 200 + 400 and one active offer every time | AC-2 | artifacts/B5-concurrent-duplicate-create.json |
| C1 | PASS | buyer, seller | API | Field at 50.25, buyer with exactly 50.25 → 200. Buyer 0, seller 17.43 → 67.68, buyer owns the field, offer sold | AC-4 | artifacts/C1-field-balance-equals-price.json |
| C2 | PASS | buyer, seller | API | Same offer, buyer with 50.24 → 400 "Insufficient funds to complete purchase (no overdraft allowed)". Balances, offer active and in browse, owner and all histories unchanged | AC-4 | artifacts/C2-field-balance-one-cent-below.json |
| C3 | PASS | buyer, seller | API | Animal at 33.33: buyer with 33.32 → 400 with nothing changed, then a buyer with 33.33 → 200 (seller 67.68 → 101.01) | AC-4 | artifacts/C3-animal-balance-one-cent-below.json, artifacts/C3-animal-balance-equals-price.json |
| C4 | PASS | buyer | API | Buyer with no money at all → 400, nothing changed | AC-4 | artifacts/C4-field-buyer-without-money.json |
| C5 | PASS | buyer, 2 sellers | API | Balance 61.17, two offers at 40 bought at once → 200 + 400. Buyer ends at 21.17, only the winning seller is credited, the other offer stays active. The first run's FAIL was a float-sum error in the probe; the rerun (C5b) rounds and passes | AC-4 | artifacts/C5b-concurrent-buys-one-balance.json, artifacts/C5-concurrent-buys-one-balance.json |
| D1 | PASS | seller | API | Seller with 88.88 buys own field offer priced 20.5 → 400 "Cannot buy your own offer", nothing changed. Control: another funded user then buys it (200) | AC-6 | artifacts/D1-buy-own-field-offer.json |
| D2 | PASS | seller | API | Same for an animal group | AC-6 | artifacts/D2-buy-own-animal-offer.json |
| D3 | PASS | seller | API | A seller with no money gets the own-offer message, not the funds message | AC-6 | artifacts/D3-buy-own-offer-without-money.json |
| E1 | PASS | stranger | API | Stranger cancels the seller's field offer → 403 "Not authorized to cancel this offer". Both parties and the stranger unchanged, offer active and in browse, and a buyer then buys it (200). The stranger's account is otherwise valid: it reads its own offers (200) and cancels its own offer (200, E4b) | AC-7 | artifacts/E1-stranger-cancels-field-offer.json |
| E2 | PASS | stranger | API | Same for an animal offer | AC-7 | artifacts/E2-stranger-cancels-animal-offer.json |
| E3 | PASS | seller, buyer, observer | API | Seller cancels (field and animal) → 200. My Offers shows `cancelled`, the offer is gone from the observer's browse, buy → 404 "Offer not found or not available", a second cancel → 400 "Offer is not active", money and items unchanged | AC-7 | artifacts/E3-seller-cancels-field-offer.json, artifacts/E3-seller-cancels-animal-offer.json |
| E4a | PASS | seller, buyer, stranger | API | Cancelling a sold offer: seller 400 "Offer is not active", buyer 403, stranger 403, nothing changed | AC-7 | artifacts/E4a-cancel-sold-offer.json |
| E4b | PASS | seller, anonymous | API | Unknown id → 404 "Offer not found". "abc", 0, −1 and 1.5 → 400 "Invalid offerId format. Must be a positive integer.". No token 401. Invalid token 403 (known bug) | AC-7 | artifacts/E4b-cancel-id-and-auth-cases.json |
| E5 | PASS | former and new owner | API | After a sale, the former owner's relist of the field or animal → 404 and the new owner's → 200 | assumption | artifacts/E5-relist-after-sale.json |
| F2-F5 | FAIL (known bugs) | buyer | API | String offerId 404, offerId 0 message, malformed JSON 500, invalid token 403. Nothing changed | AC-4 | artifacts/F2-F5-buy-input-rechecks.json |
| F6 | FAIL (known bug) | seller, buyer | API | Seller cancels during the buy → cancel 200, buy 200, offer sold (2 of 2) | AC-7 | artifacts/F6-cancel-during-buy.json |
| F7 | FAIL (known bug) | seller, buyer | API | A listed 100 ha field edited to 0.01 ha stays active and is bought at the listed price | assumption | artifacts/F7-item-edited-after-listing.json |
| F8 | FAIL | stranger, seller | API | A stranger's animal on the seller's field takes the offer down and blocks cancel and relist (problem 3) | AC-7, AC-1 | artifacts/F8-stranger-animal-on-seller-field.json |
| F9 | PASS | seller, buyer | API | Seller relisting the animal group during the buy → 400 "Item is already offered for sale"; after the buy → 404. One offer, `sold` | AC-2 | artifacts/F9-relist-during-buy.json |
| W1 | FAIL | deleted user, new user | API | A user registered after an account deletion inherits its id, balance and history (problem 1; found by the test writer) | user expectation (security) | artifacts/coordinator/id-reuse-after-delete.json |
| X2 | FAIL | seller, buyer | API + playwright-cli | HTML in a field name runs on the buyer's offer card (problem 2) | assumption (security) | artifacts/X2-buyer-browse-dom.json, artifacts/X2-html-field-name-executes-in-browse.png |

| R1 | PASS | user | API | A regular user cannot set their own or another user's balance via `PUT /financial/accounts/balance` | AC-4 (user expectation) | artifacts/review/R1-user-sets-balance-via-admin-endpoint.json |
| R2 | PASS | seller, buyer | API | After logout the old token cannot read, create, cancel or buy; nothing changed (403, known invalid-token-403) | AC-1/4/7 (user expectation) | artifacts/review/R2-old-token-after-logout.json |
| R3 | PASS | seller, buyer | API | A seller deletes their account: their active offers leave browse and cannot be bought | AC-4/7 (user expectation) | artifacts/review/R3-seller-account-deleted-with-active-offers.json |
| R3b | FAIL | deleted user, seller | API | A deleted account's token still buys (problem 5), 2 of 2 | AC-4 (user expectation) | artifacts/review/R3b-deleted-account-token.json, artifacts/review/R3c-deleted-account-token-buys-repeat.json |
| R4 | PASS | stranger | API | Cancel with id spellings 228.0, 228%20, 0228, +228: the stranger still gets 403 | AC-7 | artifacts/review/R4-cancel-id-spellings.json |
| R5 | FAIL | seller | API | Price "12,50" stored as 12, "1 000" and "1.000,00" as 1 (problem 6) | AC-1 | artifacts/review/R5-price-decimal-comma.json |
| R6 | PASS | seller, buyer, victim | API | Extra fields on create (sellerId, status, id, createdAt) and buy (buyerId, userId, price) are ignored | AC-1/4 | artifacts/review/R6-mass-assignment-create-and-buy.json |
| R7 | FAIL | seller | API | An `unavailable` offer never comes back and cannot be withdrawn (problem 8) | AC-7 (user expectation) | artifacts/review/R7-own-animal-on-own-listed-field.json |
| R8 | PASS | buyers | API | A double-submitted buy charges once; two funded buyers racing for one offer: exactly one wins, 3 of 3 | AC-4 | artifacts/review/R8-same-offer-bought-concurrently.json, artifacts/review/R8b-two-funded-buyers-same-offer.json |
| R9 | FAIL | seller, stranger | API | A stranger's animal on a listed field: the seller can neither cancel nor relist (confirms problem 3) | AC-7 | artifacts/review/R9-stranger-animal-blocks-relist.json |
| U1 | FAIL | seller | UI | Create Offer form refuses price 0.5 (problem 7) | AC-1 (user expectation) | artifacts/review/U1-ui-price-0.5-blocked.png |
| U2 | PASS | seller | UI | The form shows the server's invalid-description message; nothing stored | AC-1 | artifacts/review/U2-ui-invalid-description-message.png |
| U3 | PASS | seller | UI | A Polish description from the form is stored and rendered exactly; Cancel only on own offers, Browse shows only Buy Now | AC-1/7 | artifacts/review/U3-ui-my-offers-cancel-button.png, artifacts/review/U1-U3-ui-offers-read-back.json |

## Console
The UI was opened only to confirm problem 2.
- Login page and profile: 0 errors (`artifacts/console-01-login.txt`, `console-02-after-login.txt`).
- Marketplace: 0 errors (`console-03-marketplace.txt`).
- Reviewer's Create Offer checks: `artifacts/review/console-review-marketplace.txt`.
- Marketplace filtered to the seeded offer: 1 error, a 404 for `/x`. That is the injected `<img src=x>` from problem 2, so it is expected (`console-04-marketplace-filtered.txt`).

## Not verified / blocked
- **AC-3 and AC-5 are not in this story.** In `docs/requirements.md` §4.2, AC-3 (browse shows other users' active offers, My Offers shows your own) is covered by T3 and T5, and AC-5 (effects of a sale) by T1. Section 5 maps T2 to AC-1, 2, 4, 6 and 7, so leaving them out is deliberate, but the story does not say so and a reader may think two criteria were dropped. This run used them only as read-backs ("gone from browse", balances after the boundary buy).
- **Price upper bound:** 1e15 and 99999999.99 are accepted. The requirements set no maximum, so this is recorded but not failed.
- **Whitespace-only descriptions** are stored as sent ("   "). The AC makes the description optional and allows whitespace, so this is not a finding.
- **The UI create-offer form** was not tested by the tester; the reviewer covered it (U1–U3).

## Assumptions
- "Letters (including Polish)" means ASCII letters plus the 18 Polish letters the AC lists. Refusing é/ü/ß, Cyrillic, CJK and Arabic is treated as intended.
- "Invalid input → 400" covers wrong types for `price`, `itemId` and `description`. A value the app silently coerces (`"12abc"` → 12) counts as a failure.
- Refusals for an item in use (A11) answer 400, not 404. The AC is silent on this, and 400 with a clear message is accepted.
- The first A5 Polish cases sent 318 and 319 characters by mistake, because `'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'` has 18 letters. A5b, with exactly 300 and 301, replaces them, and those entries in `A5-description-length-accepted.json` and `A5-description-length-refused.json` are not evidence.

## Regression checks of known bugs
- `post-api-marketplace-offers--create-offer-status-in-message.md`: still reproduces (A1/A2: HTTP 200 with `message: 201`).
- `post-api-marketplace-buy--offer-id-zero-message.md`: still reproduces (F2-F5).
- `post-api-marketplace-buy--string-offer-id-404.md`: still reproduces (F2-F5, nothing changed).
- `post-api-app-input--malformed-json-500.md`: still reproduces on `/marketplace/offers` and `/marketplace/buy` (A12, F2-F5).
- `post-api-auth-token--invalid-token-403.md`: still reproduces on create, buy and cancel (A12, F2-F5, E4b).
- `delete-api-marketplace-offers--cancel-during-buy-still-sold.md`: still reproduces, 2 of 2 (F6). Suggested to raise to major (problem 4).
- `put-api-marketplace-offers--item-edited-after-listing.md`: still reproduces (F7).
- `post-api-fields-ownership--non-owner-attaches-animals-and-staff.md`: still reproduces, with a new consequence: it takes down active offers (F8, problem 3).
- `delete-api-fields-ownership--non-owner-delete-wipes-assignments.md`: not re-checked; field deletion and assignments are outside this story's rules.
- `post-api-marketplace-buy--field-deleted-during-buy.md`, `post-api-marketplace-buy--animals-added-during-buy.md`, `post-api-marketplace-buy--seller-assignment-survives-sale.md`: not re-checked; they are about AC-5 effects of a sale, which is T1's scope.
- `get-api-marketplace-docs--openapi-history-shape.md`: not re-checked, since the history shape is AC-5. Other contract gaps are in problem 9.

## Automation
Branch `test/marketplace-business-rules`, [PR #25](https://github.com/klapoucho/qa-ronpol/pull/25): `tests/api/marketplace/business-rules.spec.ts` + `business-rules.params.ts`, 13 tests — one positive parametrized test (2 cases: field at 0.01 without a description; animal group with a 300-character description of every allowed character) and one negative parametrized test (11 refusal cases covering AC-1, 2, 4, 6, 7; each asserts status, exact message and that both users' state is unchanged). Price 0 is a `test.fail()` linked to `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md`. Trimmed from a first version of 50 tests at the author's request (the task asks for 5 readable tests in total). Stability 130/130 at 10×; one run about 22 s. Not automated by the author's decision: the AC-4 boundary where the balance equals the price exactly (T1 buys with a balance above the price), so an off-by-one at equality would pass both specs. The deleted-account case (problem 5) is not automated: the account-id reuse (problem 1) would leak its data into parallel tests.

## Lessons applied
- Every actor holding money starts at a non-zero, non-round balance (17.43, 50.24/50.25, 33.32/33.33, 61.17, 88.88).
- Transfer: both item types were tested, and the former owner, a stranger and the buyer each acted before, during and after a sale (E1–E5, F6, F8, F9).
- Each refusal was checked for status, exact message, and an unchanged state that includes histories, not only balances.
