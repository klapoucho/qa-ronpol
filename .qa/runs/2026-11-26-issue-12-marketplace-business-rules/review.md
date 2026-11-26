# Review: Marketplace business rules for offers and purchases (API)

**Run:** 2026-11-26-issue-12-marketplace-business-rules · **Reviewer date:** 2026-11-26 · **Env:** http://localhost:3000/api/v1, Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Tools:** Node fetch with `X-Synthetic-Token`; Chromium through playwright-cli (session `2026-11-26-issue-12-marketplace-business-rules-review`, 1280×720) · **Accounts:** fresh registered users only (`qa.t2.r*` / `qa.t2.ui*`)

## 1. Verdict: GAPS CLOSED

The tester's coverage of AC-1, AC-2, AC-4, AC-6 and AC-7 holds up. Every PASS I opened shows the claimed state, with a negative control that would fail if the rule were half broken. No artifact is byte-identical to another. I closed every gap I found myself (the UI half of the gates and messages, session lifecycle, one unproven claim).

The review found one new **major** problem: the token of a deleted account can still buy. Money leaves the deleted account, the seller is paid, and the item moves into an account nobody can sign in to (N1). It also found three minor problems (N2 to N4) and one correction to the report.

## 2. Coverage checklist

| Point | Result | Note |
|---|---|---|
| Scope: every AC has a check | OK | AC-1, 2, 4, 6, 7 covered for both item types. Leaving out AC-3 and AC-5 is justified (§5 of the requirements maps them to T1, T3 and T5). |
| Scope: user expectation (UI entry point of the same rules) | GAP, closed | The tester did not use the create form. Closed in U1 to U3: the UI refuses prices below 1 although the AC says "greater than 0" (N3). A server refusal message shows in the UI, and a Polish description round-trips. |
| Roles: forbidden side of each gate, API | OK | Not owner → 404 (A10). Own offer → 400 (D1 to D3). Stranger and buyer cancelling → 403 (E1, E2, E4a). Anonymous → 401 (A12, E4b). |
| Roles: gate in the UI | GAP, closed | U3: Browse renders only "Buy Now" (9 cards, 0 Cancel buttons, own offer absent). My Offers renders "Cancel" on the user's own offer. |
| Roles: session lifecycle (logout, deleted account) | GAP, closed | R2: after logout the old token is refused for read, create, cancel and buy (403, known 401/403 bug). R3b and R3c: **a deleted account's token still buys** (N1). |
| Evidence: artifacts show the claim | OK, one NOT PROVEN closed | Checked C2, E1, E3, A5b, B1, X2 and F8, all as claimed. Problem 2 says "relisting answers 400 'Cannot sell field with assigned animals'" for the listed field, but `F8-…json` only shows the first listing of an *unlisted* field. R9 reproduces the claim on a listed field (relist 400, seller sees no animals, relist works once the stranger removes the animal). |
| Evidence: checksums | OK | `md5 -r` over `artifacts/`: no duplicates. |
| Negative controls | OK | C1 and C2 use the same offer (one cent short, then exact). D1 is funded above the price. The E1 stranger is shown to be a valid user. A10 has an owner control. The "nothing changed" snapshot includes histories. |
| Input → output | OK | The API reads every accepted value back (stored and in browse). The UI read-back was closed in U3 (stored `Żółta łąka (1,7 ha): świetna!` equals what was typed and renders on the card). |
| Data: must be absent / more than fits | OK | Cancelled, sold and unavailable offers are absent from browse. Browse is filtered by id, never by count. Pagination is UI-only and outside this API story. |
| Regressions (`.qa/bugs/ghissue-11/`) | OK | 8 re-checked. The 5 skipped are outside the story's rules, with reasons that hold. |
| Tool traps | OK | Bodies are read back, not only statuses. Allowed values were taken from the source and live calls. Console was checked: my session shows only the expected 400 from U2 (`artifacts/review/console-review-marketplace.txt`). |
| Report accuracy | 1 correction | Problem 4 says "Only 'price 0' is reachable through ordinary use". It is not: the UI blocks 0 twice (`min="1"` on the input and `!price` in `_createOffer`), so price 0 is API-only. Severity minor stands. |

## 3. Experiments

| # | Charter | Hypothesis | Result | Evidence |
|---|---|---|---|---|
| R1 | Admin balance endpoint: a user sets a balance, bypassing AC-4 | A regular user cannot set their own or another user's balance | HELD: 403 on both, balances unchanged (13.57 / 24.68) | artifacts/review/R1-user-sets-balance-via-admin-endpoint.json |
| R2 | Logout: an old token still trades | After `POST /logout` the old token cannot read, create, cancel or buy | HELD: all 4 refused, state equal, the user's offer still active. Status 403 "Invalid or expired token", not 401 (known `post-api-auth-token--invalid-token-403`, now also for revoked tokens) | artifacts/review/R2-old-token-after-logout.json |
| R3 | Seller deletes the account while 2 offers are active | The offers leave browse and cannot be bought | HELD: browse empty for that seller, buy 404, buyer unchanged | artifacts/review/R3-seller-account-deleted-with-active-offers.json |
| R3b | A deleted account's token (buyer side) | Refused (401) everywhere | **BROKE**: profile 404 and create 400 "User not found", but my-offers and browse 200, account 200 (balance 15.15) and **buy 200**. The seller is paid, the offer is `sold`, the field leaves the seller | artifacts/review/R3b-deleted-account-token.json |
| R3c | Repeat R3b and read both sides | as R3b | **BROKE** (2/2): login with the deleted account 401, its old token buys. Balance 15.15 → 10.10, `GET /fields` with that token lists the field, the seller goes 4.32 → 9.37 and no longer owns it | artifacts/review/R3c-deleted-account-token-buys-repeat.json |
| R4 | Cancel with lenient id spellings (`228.0`, `228%20`, `0228`, `+228`) | The owner gate still holds | HELD: stranger 403 on all 4, offer still active. The owner's `228.0` cancels (ids are parsed with `Number`, harmless) | artifacts/review/R4-cancel-id-spellings.json |
| R5 | Price written the Polish way | `"12,50"`, `"1 000"` and `"1.000,00"` are refused | **BROKE**: 200, stored as 12, 1 and 1. `"0,99"` → 400 "Price must be greater than 0" (N2) | artifacts/review/R5-price-decimal-comma.json |
| R6 | Mass assignment on create and buy | `sellerId`, `status`, `id` and `createdAt` in create, and `buyerId`, `userId` and `price` in buy, are ignored | HELD: stored sellerId = caller, `active`, new id, server time. The buy charged the real buyer 8.08, the injected victim unchanged | artifacts/review/R6-mass-assignment-create-and-buy.json |
| R7 | The seller's own animal on their own listed field, then removed | The offer comes back, or can at least be withdrawn | **BROKE** (UX): `unavailable` while the animal is on the field (expected). After the animal is deleted it stays `unavailable` forever. Cancel → 400 "Offer is not active". A relist creates a second offer, so My Offers shows a dead and a live offer for one field (N4) | artifacts/review/R7-own-animal-on-own-listed-field.json |
| R8 | Double submit of one buy | One 200, one refusal, charged once | HELD: 200 + 404, buyer charged 20.20 once, seller has one transaction | artifacts/review/R8-same-offer-bought-concurrently.json |
| R8b | Two funded buyers, one offer, at once (3 rounds) | Exactly one wins, the money matches | HELD 3/3: 200 + 404, seller 3.21 → 33.51, payments sum to 30.30 | artifacts/review/R8b-two-funded-buyers-same-offer.json |
| R9 | Close the F8 NOT PROVEN (relist after a stranger's animal) | The seller cannot cancel or relist | Confirms problem 2: hidden from browse, `unavailable`, cancel 400, relist 400 "Cannot sell field with assigned animals", seller's `/animals` empty. Relist works again only after the stranger deletes the animal | artifacts/review/R9-stranger-animal-blocks-relist.json |
| U1 | UI create form: price 0.5 (AC: price > 0) | Accepted like the API | **BROKE**: native validation "Value must be greater than or equal to 1.", nothing sent, no offer stored (N3) | artifacts/review/U1-ui-price-0.5-blocked.png, artifacts/review/U1-U3-ui-offers-read-back.json |
| U2 | UI create form: description with `$` and `?` | The server's refusal reaches the user | HELD: error toast "Description contains invalid characters", no offer stored | artifacts/review/U2-ui-invalid-description-message.png, console-review-marketplace.txt |
| U3 | UI create, valid Polish description; cancel gate in the UI | Stored as typed; Cancel only on own offers | HELD: toast "Offer created successfully!". My Offers card shows the text exactly, with "Cancel". Browse has 9 cards, all "Buy Now", none own | artifacts/review/U3-ui-my-offers-cancel-button.png, artifacts/review/U1-U3-ui-offers-read-back.json |

**Totals:** 15 experiments, 11 held, 4 broke (R3b and R3c are one problem, plus R5, R7 and U1). Per-call lines: `artifacts/review/review-log.txt`. Scripts: `scratch/review/`. Ids: `scratch/review/seed-state.json`.

## 4. New problems

### N1. A deleted account's token can still buy: money leaves the deleted account and the item vanishes with it. Major (security)
- **Steps:**
  1. Register user D, add 15.15 ROL.
  2. User E lists a field at 5.05.
  3. D calls `DELETE /api/v1/users/profile` → 200 "Account deleted successfully". `POST /login` with D's credentials → 401, `GET /users/profile` with D's token → 404 "User not found".
  4. With the same old token, D calls `POST /api/v1/marketplace/buy { offerId }`.
- **Expected:** the token of a deleted account is refused everywhere (401), as after logout (R2). Nobody can trade on behalf of an account that no longer exists.
- **Actual:**
  - Buy → 200 "Purchase completed successfully". D's balance goes 15.15 → 10.10, E receives 5.05 and the offer is `sold`.
  - The field leaves E and belongs to the deleted account. `GET /fields` with the old token lists it, and nobody can sign in to use it.
  - The same token also reads `/marketplace/offers`, `/marketplace/my-offers` and `/financial/account` (200, balance shown). Only create offer answers 400 "User not found".
  - 2 of 2 attempts (R3b, R3c).
- **Who is hurt:** a user who deleted their account (for example on a shared or lost device) has not ended their sessions. Whoever holds a token keeps spending the remaining balance. The seller's item goes to a dead account.
- **Evidence:** `artifacts/review/R3b-deleted-account-token.json`, `artifacts/review/R3c-deleted-account-token-buys-repeat.json`
- **Env:** API, Rolnopol 1.126.0, fresh users `qa.t2.r3bd.*` / `qa.t2.r3cd.*` (ids in `scratch/review/seed-state.json`).
- **Hint (optional):** logout revokes the token, but account deletion does not, and `buyItem` never checks that the buyer still exists. The financial account also survives the deletion.

### N2. Create offer: a price with a decimal comma or a thousands separator is cut short and stored, so the item is listed far below what the seller typed. Minor
- **Steps:** `POST /api/v1/marketplace/offers { itemType: "field", itemId, price: "12,50" }` (also `"1 000"`, `"1.000,00"`).
- **Expected:** 400 naming the price format, nothing stored. This is the same rule as problem 4 (`"12abc"`), and the format Polish users write by default.
- **Actual:** 200. Stored prices: 12 (from "12,50"), 1 (from "1 000") and 1 (from "1.000,00"). The offer is `active` and buyable at that price. `"0,99"` → 400 "Price must be greater than 0", which misleads the user.
- **Reachability:** API only. The UI's `type="number"` input normalises the decimal separator. Part of problem 4's root cause, listed separately because a Polish-format price is a realistic client input, not a crafted one.
- **Evidence:** `artifacts/review/R5-price-decimal-comma.json`
- **Env:** API, Rolnopol 1.126.0, fresh user `qa.t2.r5s.*`.

### N3. The Create Offer form refuses any price below 1 ROL, although the rule (and the API) allow anything above 0. Minor (UI/API mismatch, user expectation)
- **Steps:** log in as a user with a field. Marketplace → Create Offer → Field → pick the field → Price `0.5` → Create Offer.
- **Expected:** AC-1 says "a price greater than 0", and the API accepts 0.01 (tester A4). The form should accept 0.5, or the rule should say 1.
- **Actual:** the browser blocks the submit with "Value must be greater than or equal to 1." (`<input type="number" min="1" step="0.01">`). No request is sent and no offer is stored. The form's own JS check says "greater than 0", which contradicts the native message.
- **Evidence:** `artifacts/review/U1-ui-price-0.5-blocked.png`, `artifacts/review/U1-U3-ui-offers-read-back.json` (the only offer stored is U3's)
- **Env:** Chromium via playwright-cli 1280×720, http://localhost:3000/marketplace.html, fresh user `qa.t2.ui.*`.

### N4. An offer marked "unavailable" never comes back and cannot be withdrawn, so My Offers keeps a dead offer next to the new one. Minor (UX)
- **Steps:**
  1. The seller lists field F.
  2. The seller adds an animal on F (`POST /animals { fieldId: F }`): the offer turns `unavailable` and leaves browse (expected, "item in use").
  3. The seller deletes the animal.
  4. The seller tries to cancel the offer, then lists F again.
- **Expected:** once the item is free, the offer comes back (`active`), or the seller can withdraw it.
- **Actual:** it stays `unavailable` for good. `DELETE /marketplace/offers/{id}` → 400 "Offer is not active", and the UI's Cancel button is disabled. Listing again works, so My Offers now holds two offers for one field (`235:unavailable`, `236:active`), and the dead one cannot be removed.
- **Evidence:** `artifacts/review/R7-own-animal-on-own-listed-field.json`
- **Env:** API, Rolnopol 1.126.0, fresh user `qa.t2.r7s.*`.
- **Note:** with a *stranger's* animal (problem 2 / R9) the same mechanism blocks the seller completely. N4 is the seller's own, milder variant.

## 5. Notes for the report
- Problem 4: change "Only 'price 0' is reachable through ordinary use" to API-only. The UI blocks price 0 before any request.
- Problem 2: cite `artifacts/review/R9-stranger-animal-blocks-relist.json` for the relist claim.
- Known bug `post-api-auth-token--invalid-token-403`: it also covers revoked (logged-out) tokens (R2).
