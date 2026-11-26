<!-- qa-pick summary · run 2026-11-26-issue-13-marketplace-seller-lists-an-item -->
## 🧪 QA: Marketplace: seller lists an item (UI) — ❌ FAIL

| | |
|---|---|
| **Run** | `2026-11-26-issue-13-marketplace-seller-lists-an-item` · 2026-11-26 |
| **Env** | http://localhost:3000 · Rolnopol 1.126.0 (Docker) · web: installed Google Chrome 158.0.8127.88 via playwright-cli 0.1.24 (1366×768, 1280×720, 375×812), API (Node fetch) |
| **Tested** | issue #13, no linked PR |
| **Roles** | registered user as seller and as another user, logged-out and anonymous (fresh accounts) · skipped: admin (no admin rule in the story), demo accounts (not allowed) |
| **Reviewer** | GAPS CLOSED: PASS for AC-1 and AC-3 confirmed with read-back evidence; added the logged-out gate, another user's item, the full allowed character set, phone width and the empty state (14 experiments, 5 broke) |
| **Automation** | branch `test/ui-seller-lists-item`: one UI test for T3 (U1), stability 10/10 + slow network, 8/8 poisons caught · [PR #28](https://github.com/klapoucho/qa-ronpol/pull/28) |

The verdict is FAIL because two major security problems sit on the story's own flow: a field name with HTML runs as script on the offer card the seller creates (now also in My Offers), and a deleted account's token still creates fields whose live offer the next registered user inherits. Both are known bugs that this story's flow reaches; the acceptance criteria themselves pass. Creating an offer works through the UI for both item types. A seller picks a field, enters a price and a Polish description, and gets "Offer created successfully!". The offer appears in My Offers, is stored exactly as typed, and shows in other users' Browse but not in the seller's own. Wrong input is refused with a readable message, and the form keeps its values. The rest of the problems are minor UX and layout issues.

### Problems

> [!CAUTION]
> **1. A field name with HTML runs as script on the offer card, now also in the seller's own My Offers** · major (security, known bug) · `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`
>
> **Steps:** 1. Seller creates a field named `QA<b>bold</b><img src=x onerror="document.title='QA-T3-XSS'">`. 2. Lists it from the Create Offer form. 3. Opens My Offers; another user opens Browse.<br>
> **Expected:** the name shows as text everywhere.<br>
> **Actual:** the `<img>` is inserted and `onerror` runs in the seller's My Offers and in the other user's Browse (page title becomes `QA-T3-XSS`). The dropdown and the cancel modal escape it.
>
> ![Browse card: field name rendered as bold HTML with a broken image](https://github.com/user-attachments/assets/7b12ab6e-2bd9-4a5b-95d4-5665c84e381b)

> [!CAUTION]
> **2. A deleted account's token still creates fields, and the next registered user inherits them along with the deleted account's live offer** · major (security, known bugs extended) · `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`
>
> **Steps:** 1. User D lists field f1, then deletes the account (`DELETE /users/profile` → 200). 2. With D's old token: create offer → 400 "User not found", but `POST /fields` → 201. 3. A new user registers.<br>
> **Expected:** every request with the deleted token answers 401; a new user starts empty.<br>
> **Actual:** the new user gets D's id, balance, the field created after deletion and D's offer, which is `active` in Browse for a field removed with the account. The new user can cancel it.<br>
> **Evidence:** `artifacts/A4-deleted-account-token-create.json`, `artifacts/A4-cleanup-sink-cancels-inherited-offer.json`

> [!WARNING]
> **3. One long word in a description stretches every buyer's Marketplace page sideways** · minor · `.qa/bugs/ghissue-13/ui-marketplace-browse--long-description-word-overflows.md`
>
> **Steps:** 1. List a field with a valid 300-letter description without spaces. 2. Another user opens Browse.<br>
> **Expected:** the text wraps inside the card.<br>
> **Actual:** it runs ~2,100 px out of its 373 px card; the page is 2,583 px wide in a 1,366 px window.
>
> ![Browse card whose description runs far past the card edge](https://github.com/user-attachments/assets/27172527-3985-4c92-8100-b86a2da437fb)

> [!WARNING]
> **4. Double-clicking Create Offer sends two requests and shows "Error" next to "Success"; nothing shows the request is running** · minor · `.qa/bugs/ghissue-13/ui-marketplace-create--double-submit-error-and-success.md`
>
> **Steps:** 1. Create Offer → Field → a free field → 8.88 → double-click Create Offer.<br>
> **Expected:** one request, one message; the button is disabled while it runs.<br>
> **Actual:** two requests; "Error: Item is already offered for sale" above "Success: Offer created successfully!". With a 3 s slow backend the button stays enabled with no progress.
>
> ![Error and Success toasts shown together after one double click](https://github.com/user-attachments/assets/43d8c13f-4896-4aef-98cd-48cdb7be6f7f)

> [!WARNING]
> **5. The Item dropdown still offers items that already have an active offer** · minor · `.qa/bugs/ghissue-13/ui-marketplace-create--dropdown-lists-offered-items.md`
>
> **Steps:** 1. List fields. 2. Reload Marketplace → Create Offer → Field.<br>
> **Expected:** listed items are left out or marked (fields with animals already are).<br>
> **Actual:** all 9 listed fields and the listed animal group are offered; the user learns "Item is already offered for sale" only after submit.<br>
> **Evidence:** `artifacts/U3c-dropdown-lists-already-offered-items.json`, `artifacts/U3c-dropdown-open.png`

> [!WARNING]
> **6. When the session ends elsewhere, Create Offer redirects to the login page without a word and the typed offer is lost** · minor · `.qa/bugs/ghissue-13/ui-marketplace-create--session-end-loses-offer.md`
>
> **Steps:** 1. Fill the form. 2. Log the same user in elsewhere. 3. Click Create Offer.<br>
> **Expected:** a "session expired" message, ideally keeping the input.<br>
> **Actual:** 403, cookies wiped, empty login page, no explanation; the input is gone.<br>
> **Evidence:** `artifacts/U10-session-ended-while-form-filled.json`, `artifacts/U10-after-submit-redirected.png`

> [!WARNING]
> **7. The description rules show only after submit, and "invalid characters" does not say which one** · minor · `.qa/bugs/ghissue-13/ui-marketplace-create--description-rules-hidden.md`
>
> **Steps:** 1. Description "Czy kupisz?" → Create Offer. 2. A 301-character description.<br>
> **Expected:** the form says what is allowed (or counts characters); the refusal names the character.<br>
> **Actual:** "Description contains invalid characters" with no hint; the length limit appears only at submit.<br>
> **Evidence:** `artifacts/U6k-description-question.json`, `artifacts/U6i-description-301.json`

> [!WARNING]
> **8. Letters outside the Polish alphabet (é, ü, ß) and decomposed Polish letters are refused** · minor (reviewer; needs the author's decision on AC-1) · `.qa/bugs/ghissue-13/post-api-marketplace-offers--non-polish-letters-refused.md`
>
> **Steps:** 1. Create Offer → description `Café Müller Straße` → Create Offer.<br>
> **Expected:** AC-1 allows "letters (including Polish)", so they are accepted — or AC-1 says "Polish letters only".<br>
> **Actual:** 400 "Description contains invalid characters"; the same for `Zielona łąka` typed in decomposed form.
>
> ![Create Offer form with "Café Müller Straße" and an invalid-characters error](https://github.com/user-attachments/assets/2383c3ee-f5c0-4bd0-a707-b0c7b11ac223)

> [!WARNING]
> **9. A description sent as a JSON array gets past the 300-character limit** · minor (crafted API input, reviewer) · `.qa/bugs/ghissue-13/post-api-marketplace-offers--array-description-bypasses-limit.md`
>
> **Steps:** 1. `POST /api/v1/marketplace/offers` with `description: ["x"×500]`.<br>
> **Expected:** 400, as for a 301-character string (OpenAPI documents `description` as a string).<br>
> **Actual:** 200; stored as an array and served to Browse as 500 characters.<br>
> **Evidence:** `artifacts/review/R4-description-array-bypasses-limit.json`

> [!WARNING]
> **10. On a phone the Marketplace tab bar is wider than the screen** · minor (reviewer) · `.qa/bugs/ghissue-13/ui-marketplace-tabs--mobile-tab-bar-overflows.md`
>
> **Steps:** 1. Open Marketplace at 375×812.<br>
> **Expected:** the tabs fit; no sideways scroll (the home page has none).<br>
> **Actual:** the tab bar is 397 px wide, "Transaction History" is cut off, the page scrolls sideways. The form itself works.
>
> ![Marketplace at 375 px: the last tab is cut off at the right edge](https://github.com/user-attachments/assets/2ee65c9e-08c2-4083-9135-05dcf09dfacb)

> [!WARNING]
> **11. Any price is accepted without a check, and one offer takes over the shared TOTAL VALUE** · minor (reviewer; may be intended) · `.qa/bugs/ghissue-13/ui-marketplace-create--implausible-price-skews-total-value.md`
>
> **Steps:** 1. Create Offer with price 123456789012.34.<br>
> **Expected:** an upper bound or a confirmation for an implausible price.<br>
> **Actual:** accepted at once; every user's TOTAL VALUE went from 506 752,73 to 123 457 295 737,19 (the offer was cancelled afterwards).<br>
> **Evidence:** `artifacts/review/R5-my-offers-huge-price-and-array-description.png`, `artifacts/review/R12-readback-and-cleanup.json`

> [!NOTE]
> **12. The offer card heading shows `field #id` / `animal #id` instead of the item name; typed line breaks are joined** · cosmetic · `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md`
>
> **Evidence:** `artifacts/U12b-observer-browse-card.png`, `artifacts/U2-my-offers-dom.json`

> [!NOTE]
> **13. The status dot covers the end of the price ("ROL") on every offer card** · cosmetic (reviewer) · `.qa/bugs/ghissue-13/ui-marketplace-browse--status-dot-over-price.md`
>
> **Evidence:** `artifacts/review/R9-status-dot-over-price.png`, `artifacts/review/R9-status-dot-vs-price.json`

### Not verified

- Firefox, WebKit and Playwright's bundled Chromium — manual QA ran on the installed Google Chrome only.
- Browse pagination and filters — not this story (T5).
- Whether the deleted account's offer left Browse between the deletion and the next registration — Browse was not read in that window.

<details>
<summary><b>Test cases</b> — 34 ✅ · 16 ❌ (R… = reviewer experiments, K… = known-bug spot checks)</summary>

| # | | Role | Case | Requirement | Evidence |
|---|---|---|---|---|---|
| U1 | ✅ | seller, other user | Field B (2nd of 2) at 12.34 with a Polish description: toast, form reset, My Offers card, stored as typed; other user's Browse lists it, seller's does not | AC-1, AC-3 | `artifacts/U1-api-readback.json` |
| U2 | ✅ | seller, other user | Animal group (pig ×2) at 7.07, empty description | AC-1, AC-3 | `artifacts/U2-api-readback.json` |
| U3 | ✅ | seller, other user | Dropdown lists own free fields and groups only | AC-1 | `artifacts/U3-dropdown-contents.json` |
| U3c | ❌ | seller | Already-listed items still offered after reload (problem 5) | user expectation | `artifacts/U3c-dropdown-lists-already-offered-items.json` |
| U4 | ✅ | seller | Already-listed field: "Item is already offered for sale", input kept | AC-1 | `artifacts/U4-already-offered-form-state.json` |
| U5 | ✅ | seller | Field deleted after page load: 404 toast, nothing stored | AC-1 | `artifacts/U5-item-deleted-after-page-load.json` |
| U6a–c | ✅ | seller | Empty form, no item, no price blocked, 0 requests | AC-1 | `artifacts/U6a-empty-form.json` |
| U6d, U6g | ✅ | seller | Price 0 and −5 blocked | AC-1 | `artifacts/U6d-price-0.json` |
| U6e, U6f | ❌ | seller | Price 0.5 and 0.99 blocked by `min=1` (known bug) | AC-1 | `artifacts/U6e-price-0.5.json` |
| U6h | ✅ | seller | 12.345 blocked by `step=0.01` | assumption | `artifacts/U6h-price-3-decimals.json` |
| U6i | ✅ | seller | 301-char description refused with a toast | AC-1 | `artifacts/U6i-description-301.json` |
| U6j, U6k | ✅ | seller | `<b>` and `?` refused (400), input kept | AC-1 | `artifacts/U6k-description-question.json` |
| U6l | ✅ | seller, other user | Price 1 accepted and stored | AC-1 | `artifacts/U6l-api-readback.json` |
| U7a | ✅ | seller, other user | 300 Polish letters accepted, stored byte-equal | AC-1 | `artifacts/U7a-api-readback.json` |
| U7b | ✅ | seller | 300 chars with newlines sent as LF and accepted | AC-1 | `artifacts/U7b-description-300-with-newlines.json` |
| U8 | ✅ | seller | Input kept after refusals, reset after success | user expectation | `artifacts/U4-already-offered-form-state.json` |
| U9, U9b | ❌ | seller | Double submit; no loading state (problem 4) | user expectation | `artifacts/U9-double-click-submit.json` |
| U10 | ❌ | seller | Session ended elsewhere: input lost, no message (problem 6) | user expectation | `artifacts/U10-session-ended-while-form-filled.json` |
| U11 | ✅ | seller, other user | 12 own offers in all states in My Offers, no other user's offer | AC-3 | `artifacts/U11-my-offers-many-states.json` |
| U12a | ✅ | seller | Own offer hidden from own Browse | AC-3 | `artifacts/U12a-seller-browse-own-offer-hidden.json` |
| U12b | ✅ | other user | Offer visible in another user's Browse | AC-3 | `artifacts/U12b-observer-browse-sees-offer.json` |
| U13 | ❌ | seller, other user | HTML field name runs as script (problem 1) | known bug | `artifacts/U13-html-field-name-my-offers.json` |
| U14 | ❌ | seller, other user | Long word overflows card and page (problem 3) | user expectation | `artifacts/U14b-observer-browse-long-word-overflow.json` |
| U14c | ✅ | other user | Form top row aligned at 1366×768 | user expectation | `artifacts/U14c-form-geometry.json` |
| A0 | ✅ | user | A new login replaces the previous token | assumption | `artifacts/A0-login-replaces-previous-token.json` |
| A2 | ✅ | seller, other user | Cancelled offer stays in My Offers, leaves Browse | AC-3 | `artifacts/A2-cancelled-offer-visibility.json` |
| A3 | ✅ | user | Logged-out token cannot create an offer | AC-1 | `artifacts/A3-logged-out-token-create.json` |
| A4 | ❌ | deleted user, new user | Deleted token: offer refused, but `POST /fields` 201 and inheritance (problem 2) | user expectation | `artifacts/A4-deleted-account-token-create.json` |
| K1 | ❌ | seller | Known invalid-price bug spot check | known bug | `artifacts/R1-known-invalid-price-spot-check.json` |
| K2 | ❌ | seller, other user | Known item-edited-after-listing bug | known bug | `artifacts/R2-known-item-edited-after-listing.json` |
| R1 | ✅ | logged-out user | Direct URL to Marketplace redirects to login | AC-1 (gate) | `artifacts/review/R1-logged-out-direct-url.json` |
| R2 | ✅ | anonymous, seller | No token 401; another user's field 404 | AC-1 | `artifacts/review/R2-anonymous-and-not-owned-create.json` |
| R3a | ✅ | seller | Every allowed description character accepted, stored byte-equal | AC-1 | `artifacts/review/R3-description-charset-cases.jsonl` |
| R3b | ❌ | seller | é, ü, ß and decomposed Polish letters refused (problem 8) | AC-1 | `artifacts/review/R3b-non-polish-letters-refused.png` |
| R4 | ❌ | seller | Array description bypasses the limit (problem 9) | AC-1 | `artifacts/review/R4-description-array-bypasses-limit.json` |
| R5 | ❌ | seller, other user | Huge price takes over TOTAL VALUE (problem 11) | user expectation | `artifacts/review/R5-my-offers-huge-price-and-array-description.png` |
| R6 | ✅ | seller | Listing moves no money, adds no transaction | user expectation | `artifacts/review/R6-listing-moves-no-money.json` |
| R7 | ✅ | seller | Cancel modal escapes an HTML field name | known bug | `artifacts/review/R7-confirm-modal-field-name-html.json` |
| R8 | ❌ | seller | 375 px: tab bar overflows (problem 10) | user expectation | `artifacts/review/R8-mobile-375-create-form.png` |
| R9 | ❌ | seller | Status dot over the price (problem 13) | user expectation | `artifacts/review/R9-status-dot-over-price.png` |
| R10 | ✅ | seller, other user | Relist after cancel: both in My Offers, only the new one in Browse | AC-3 | `artifacts/review/R10-relist-after-cancel.jsonl` |
| R11 | ✅ | seller | "12,34" typed is stored as 12.34 | user expectation | `artifacts/review/R11-price-comma-typed.json` |
| R12 | ✅ | seller, other user | Read-back: no own offers in own Browse, cancelled ones gone | AC-3 | `artifacts/review/R12-readback-and-cleanup.json` |
| R13 | ✅ | other user | My Offers empty state | AC-3 | `artifacts/review/R13-my-offers-empty-state.json` |

</details>

<details>
<summary><b>Known bugs re-checked</b></summary>

- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` — still reproduces, now also in My Offers
- `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md` — still reproduces, now with a live offer and a post-deletion field
- `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` — still reproduces; `POST /fields` also accepts the token
- `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md` — still reproduces
- `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md` — still reproduces
- `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-auth-token--invalid-token-403.md` — still reproduces

</details>

<details>
<summary><b>Run notes</b> — agents, lessons applied</summary>

- **Agents:** QA tester (Opus, background, ~17 min) — UI + API exploratory testing; QA reviewer (Opus, fresh context, ~8 min) — coverage check and break attempts; test writer (Opus, own worktree) — one UI test for T3, sized to the five-test task.
- **Browsers:** manual QA uses playwright-cli's default (installed Google Chrome); the automated test uses Playwright Test's default (bundled Chromium). The versions may differ.
- **Lessons applied** (branch `docs/qa-pick-lessons-issue-13`):
  - qa-test keeps playwright-cli's default browser (installed Chrome) and records its version; templates name the real browser.
  - Tester ids are U/A/K; R… is reserved for the reviewer (the tester's R1/R2 collided).
  - qa-review resizes to the tester's 1366×768 viewport.
  - The handoff template asks for page readiness (data loaded once on start) — the writer hit an empty Item list on a slow network.
  - `.qa/notes/playwright-cli.md`: default browser and its flag bar, 1280×720 default viewport, `run-code` echoing secrets, no `process` in `run-code`, cumulative `console error`.
- **Follow-up:** the shared `toShowFields` matcher reads hidden elements (found by the writer's poison P6).

</details>

<sub>Posted by <code>/qa-pick</code> · full evidence in <code>.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/</code> · 🤖 Generated with [Claude Code](https://claude.com/claude-code)</sub>

