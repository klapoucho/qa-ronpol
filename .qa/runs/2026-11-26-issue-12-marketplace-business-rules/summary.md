<!-- qa-pick summary · run 2026-11-26-issue-12-marketplace-business-rules -->
## 🧪 QA: Marketplace: business rules for offers and purchases (API) — ❌ FAIL

| | |
|---|---|
| **Run** | `2026-11-26-issue-12-marketplace-business-rules` · 2026-11-26 |
| **Env** | http://localhost:3000/api/v1 · Rolnopol 1.126.0 (Docker) · API (Node fetch), Chromium via playwright-cli for the UI checks |
| **Tested** | issue #12, no linked PR |
| **Roles** | registered user as seller, buyer, stranger and observer (fresh accounts) · skipped: admin (no admin rule in the story), demo accounts (not allowed) |
| **Reviewer** | GAPS CLOSED: coverage of AC-1, 2, 4, 6, 7 confirmed; added the UI create form and the session lifecycle (15 experiments, 4 broke) |
| **Automation** | branch `test/marketplace-business-rules`: 13 API tests (1 positive + 1 negative parametrized test), stability 130/130 · [PR #25](https://github.com/klapoucho/qa-ronpol/pull/25) |

The rules as written hold for fields and animal groups: every refusal has the right status and exact message, and both balances, the offer, the item's owner and both users' histories stay unchanged. The verdict is FAIL because of what happens around those rules: two problems break AC-7 directly (3, 4), a deleted account can still buy (5), and a field name runs as script on the offer card (2).

### Problems

> [!CAUTION]
> **1. A newly registered user gets a deleted account's user id, with its balance and financial history** · critical (security, found by the test writer) · `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`
>
> **Steps:** 1. User A (12.34 ROL) deletes their account (`DELETE /users/profile` → 200, id 3853). 2. User B registers with another email.<br>
> **Expected:** B gets a new id, 0 ROL and no history.<br>
> **Actual:** B's id is 3853; B sees A's balance and income entry. In the test writer's runs B also received a field A had bought and A's marketplace history. 3 of 3.<br>
> **Evidence:** `artifacts/coordinator/id-reuse-after-delete.json`

> [!CAUTION]
> **2. A field name with HTML runs as script in every buyer's browser on the Marketplace offer card** · major (security) · `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`
>
> **Steps:** 1. Seller creates a field named `QA<img src=x onerror="document.title='QA-XSS-FIRED'">` (201). 2. Seller lists it. 3. Another user opens Marketplace → Browse Offers.<br>
> **Expected:** the name shows as text (the offer description is whitelisted for this reason).<br>
> **Actual:** the `<img>` is inserted into the card and its `onerror` runs in the buyer's session (page title becomes `QA-XSS-FIRED`). `PUT /fields/{id}` also accepts HTML names, so it can be changed after listing.<br>
> **Env/role:** Chromium 1366×768, fresh buyer.
>
> ![Offer card with a broken image icon after "Field: QA"](https://github.com/user-attachments/assets/5ef728c9-e853-4bd9-be95-fac19f19d920)

> [!CAUTION]
> **3. Any user can take down another user's active field offer; the seller can then neither cancel nor relist it** · major (AC-7) · `.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md` (known bug, new consequence)
>
> **Steps:** 1. Seller lists field F. 2. A stranger calls `POST /api/v1/animals { type: "rat", amount: 1, fieldId: F }` (201). 3. Seller cancels, then lists F again.<br>
> **Expected:** the stranger's write is refused; only the seller can withdraw an offer (AC-7).<br>
> **Actual:** the offer leaves browse and turns `unavailable`. Cancel → 400 "Offer is not active"; relist → 400 "Cannot sell field with assigned animals", while the seller's own `/animals` is empty.<br>
> **Evidence:** `artifacts/F8-stranger-animal-on-seller-field.json`, `artifacts/review/R9-stranger-animal-blocks-relist.json`

> [!CAUTION]
> **4. An offer the seller cancelled during a purchase is still sold** · major (raised from minor; contradicts AC-7) · `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md` (known bug)
>
> **Steps:** 1. Seller lists a field at 25.25. 2. A funded buyer starts `POST /marketplace/buy`. 3. 0.8–1.5 s later the seller calls `DELETE /marketplace/offers/{id}`.<br>
> **Expected:** the cancel or the buy is refused.<br>
> **Actual:** cancel → 200 "Offer cancelled successfully", then the buy → 200; the offer ends `sold`, the field and money move. 2 of 2.<br>
> **Evidence:** `artifacts/F6-cancel-during-buy.json`

> [!CAUTION]
> **5. A deleted account's old token can still buy** · major (security) · `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md`
>
> **Steps:** 1. User D (15.15 ROL) deletes their account (`DELETE /users/profile` → 200; login → 401). 2. With the old token, D buys another user's field at 5.05.<br>
> **Expected:** 401, nothing changes.<br>
> **Actual:** 200. D's balance 15.15 → 10.10, the seller is paid and the field moves into the deleted account, which nobody can sign in to. 2 of 2.<br>
> **Evidence:** `artifacts/review/R3b-deleted-account-token.json`, `artifacts/review/R3c-deleted-account-token-buys-repeat.json`

> [!WARNING]
> **6. Create offer: price 0 is refused as a "missing field", malformed values are accepted** · minor (API only) · `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md`
>
> **Steps:** `POST /marketplace/offers` for an owned item with `price: 0`, `"12abc"`, `[5]`, `"12,50"`; `description: 12345`; `itemId: "abc"`.<br>
> **Expected:** 400 naming the field and the rule (AC-1), nothing stored.<br>
> **Actual:** price 0 → 400 "Missing required fields: itemType, itemId, price"; `"12abc"` → 200 stored as 12, `[5]` → 5, `"12,50"` → 12; non-string descriptions stored as is; `itemId: "abc"` → 404.<br>
> **Evidence:** `artifacts/A3-price-invalid.json`, `artifacts/A8-description-wrong-type.json`, `artifacts/A9-item-type-and-id-invalid.json`, `artifacts/review/R5-price-decimal-comma.json`

> [!WARNING]
> **7. The Create Offer form refuses any price below 1 ROL** · minor · `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md`
>
> **Steps:** Marketplace → Create Offer → Field → price `0.5` → Create Offer.<br>
> **Expected:** offer created (AC-1: price greater than 0; the API accepts 0.01).<br>
> **Actual:** the browser blocks it: "Value must be greater than or equal to 1." (`min="1"`).
>
> ![Create Offer form with the browser's "must be greater than or equal to 1" tooltip on price 0.5](https://github.com/user-attachments/assets/a4067f49-9a25-4f48-99e3-712ae8bc120b)

> [!WARNING]
> **8. An offer marked unavailable never comes back and cannot be withdrawn** · minor (UX) · `.qa/bugs/ghissue-12/delete-api-marketplace-offers--unavailable-offer-stuck.md`
>
> **Steps:** 1. Seller lists field F. 2. Seller puts an animal on F (offer → `unavailable`), then removes it. 3. Seller cancels, then lists F again.<br>
> **Expected:** the offer is active again, or the seller can withdraw it.<br>
> **Actual:** it stays `unavailable`; cancel → 400 "Offer is not active". After the relist, My Offers shows a dead offer next to the live one.<br>
> **Evidence:** `artifacts/review/R7-own-animal-on-own-listed-field.json`

> [!WARNING]
> **9. OpenAPI and the live API differ for create, cancel and buy** · minor (contract) · `.qa/bugs/ghissue-12/post-api-marketplace-offers--openapi-write-ops-differ.md`
>
> **Actual:** create answers 200 not 201 (known); undocumented 400/401/403 on cancel and 401/403/500 on buy; the cancel body nests `message` in `data`; status `unavailable` is missing from the enum.<br>
> **Evidence:** `artifacts/A1-create-valid-field.json`, `artifacts/E4b-cancel-id-and-auth-cases.json`, `artifacts/F2-F5-buy-input-rechecks.json`

### Not verified

- AC-3 and AC-5 are not in this story — `docs/requirements.md` §5 maps them to T1, T3 and T5, so this is deliberate, but the story doesn't say so. Used here only as read-backs.
- Price upper bound — 1e15 and 99999999.99 are accepted; the requirements set no maximum, so recorded only.

<details>
<summary><b>Test cases</b> — 38 ✅ · 14 ❌ (R…/U… = reviewer experiments, W… = found by the test writer)</summary>

| # | | Role | Case | Requirement | Evidence |
|---|---|---|---|---|---|
| A1–A2 | ✅ | seller, observer | Valid field / animal offer stored and visible to another user | AC-1 | `artifacts/A1-…`, `A2-…` |
| A3 | ❌ | seller | Invalid prices: 24/32 refused correctly; price 0 message, `"12abc"`, `[5]` fail | AC-1 | `artifacts/A3-price-invalid.json` |
| A4 | ✅ | seller | 0.01, 0.005→0.01, 10.555→10.56, 99999999.99 accepted | AC-1 | `artifacts/A4-price-accepted.json` |
| A5 | ✅ | seller | Description 300 chars (ASCII, Polish) accepted; 301 → 400 | AC-1 | `artifacts/A5b-description-300-301-polish.json` |
| A6–A7 | ✅ | seller | Allowed characters stored equal (26 cases); disallowed refused (66 cases) | AC-1 | `artifacts/A6-…`, `A7-…` |
| A8 | ✅ | seller | Empty / missing / whitespace description accepted | AC-1 | `artifacts/A8-description-optional.json` |
| A8b | ❌ | seller | Non-string description stored as is | AC-1 | `artifacts/A8-description-wrong-type.json` |
| A9 | ❌ | seller | itemId `"abc"` / 1.5 → 404 instead of 400 (14/18 pass) | AC-1 | `artifacts/A9-item-type-and-id-invalid.json` |
| A10 | ✅ | seller, other | Item not owned → 404, owner control 200 | AC-1 | `artifacts/A10-item-not-owned.json` |
| A11 | ✅ | seller | Item in use → 400 | assumption | `artifacts/A11-item-in-use.json` |
| A12 | ✅ | anonymous | No token 401 (invalid token 403, malformed JSON 500: known) | AC-1 | `artifacts/A12-auth-and-malformed.json` |
| B1–B2 | ✅ | seller | Duplicate field / animal offer → 400, one active offer | AC-2 | `artifacts/B1-…`, `B2-…` |
| B3–B5 | ✅ | seller | Relist after cancel; same id field+animal; concurrent creates keep one | AC-2 | `artifacts/B3-…`, `B4-…`, `B5-…` |
| C1–C4 | ✅ | buyer, seller | Balance = price buys; one cent below → 400, nothing changed (both types) | AC-4 | `artifacts/C1-…` – `C4-…` |
| C5 | ✅ | buyer | Two concurrent buys on one balance: no overdraft | AC-4 | `artifacts/C5b-concurrent-buys-one-balance.json` |
| D1–D3 | ✅ | seller | Buy own offer → 400 (both types, also unfunded) | AC-6 | `artifacts/D1-…` – `D3-…` |
| E1–E2 | ✅ | stranger | Stranger cancels → 403, nothing changed, still buyable | AC-7 | `artifacts/E1-…`, `E2-…` |
| E3 | ✅ | seller | Seller cancels: gone from browse, buy 404, cancel again 400 | AC-7 | `artifacts/E3-…` |
| E4–E5 | ✅ | seller, stranger | Cancel sold offer / odd ids / no token; former owner can't relist | AC-7 | `artifacts/E4a-…`, `E4b-…`, `E5-…` |
| F2-F5 | ❌ | buyer | Buy input re-checks (known bugs) | AC-4 | `artifacts/F2-F5-buy-input-rechecks.json` |
| F6 | ❌ | seller, buyer | Cancel during buy still sold (problem 4) | AC-7 | `artifacts/F6-cancel-during-buy.json` |
| F7 | ❌ | seller, buyer | Item edited after listing sold at listed price (known) | assumption | `artifacts/F7-item-edited-after-listing.json` |
| F8 | ❌ | stranger | Stranger's animal takes the offer down (problem 3) | AC-7 | `artifacts/F8-stranger-animal-on-seller-field.json` |
| F9 | ✅ | seller | Relist during buy refused | AC-2 | `artifacts/F9-relist-during-buy.json` |
| W1 | ❌ | new user | A user registered after an account deletion inherits its id, balance and history (problem 1) | security | `artifacts/coordinator/id-reuse-after-delete.json` |
| X2 | ❌ | seller, buyer | HTML in field name runs on the offer card (problem 2) | security | `artifacts/X2-buyer-browse-dom.json` |
| R1 | ✅ | user | User cannot set balances via the admin endpoint | user expectation | `artifacts/review/R1-…` |
| R2 | ✅ | seller, buyer | Old token after logout refused everywhere | user expectation | `artifacts/review/R2-old-token-after-logout.json` |
| R3 | ✅ | seller | Deleted seller's offers leave browse | user expectation | `artifacts/review/R3-…` |
| R3b | ❌ | deleted user | Deleted account's token still buys (problem 5) | user expectation | `artifacts/review/R3c-…` |
| R4 | ✅ | stranger | Odd id spellings don't pass the cancel gate | AC-7 | `artifacts/review/R4-cancel-id-spellings.json` |
| R5 | ❌ | seller | `"12,50"` stored as 12 (problem 6) | AC-1 | `artifacts/review/R5-price-decimal-comma.json` |
| R6 | ✅ | seller, buyer | Extra body fields (sellerId, buyerId, price…) ignored | AC-1/4 | `artifacts/review/R6-…` |
| R7 | ❌ | seller | Unavailable offer stuck (problem 8) | user expectation | `artifacts/review/R7-…` |
| R8 | ✅ | buyers | Double-submit charges once; two buyers race, one wins (3/3) | AC-4 | `artifacts/review/R8b-…` |
| R9 | ❌ | seller, stranger | Seller can't cancel or relist after a stranger's animal (problem 3) | AC-7 | `artifacts/review/R9-…` |
| U1 | ❌ | seller | UI form refuses price 0.5 (problem 7) | user expectation | `artifacts/review/U1-ui-price-0.5-blocked.png` |
| U2–U3 | ✅ | seller | UI shows the server's message; Polish description round-trips; Cancel only on own offers | AC-1/7 | `artifacts/review/U2-…`, `U3-…` |

</details>

<details>
<summary><b>Known bugs re-checked</b></summary>

- `.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-marketplace-buy--offer-id-zero-message.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-marketplace-buy--string-offer-id-404.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-app-input--malformed-json-500.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-auth-token--invalid-token-403.md` — still reproduces (also for logged-out tokens)
- `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md` — still reproduces, raised to major
- `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-fields-ownership--non-owner-attaches-animals-and-staff.md` — still reproduces, new consequence (problem 3)
- Not re-checked (AC-5 / outside these rules): field deleted / animals added during buy, seller assignment after sale, non-owner field delete, OpenAPI history shape

</details>

<details>
<summary><b>Run notes</b> — agents, lessons applied</summary>

- **Agents:** QA tester — Opus 5.5, default effort — exploratory API testing of five rules × two item types; QA reviewer — Opus 5.5, fresh context — coverage check and break attempts; test writer — Opus 5.5, own worktree — parametrized API spec; test reviewer — fresh context, after the writer.
- **Lessons applied:** non-round starting balances for every actor; transfer checks before / during / after a sale for both item types; "nothing changed" includes both users' histories.
- **Retro** ([PR #26](https://github.com/klapoucho/qa-ronpol/pull/26)): the tester now checks one boundary through the screen that sets the same rule and old tokens on money endpoints, and backs every Problems claim with its own artifact; the writer sizes the spec to the story's Test section; boundary strings are built in code with a length check and money is compared in cents; account deletion runs only in an isolated run.

</details>

<sub>Posted by <code>/qa-pick</code> · full evidence in <code>.qa/runs/2026-11-26-issue-12-marketplace-business-rules/</code> · 🤖 Generated with [Claude Code](https://claude.com/claude-code)</sub>

