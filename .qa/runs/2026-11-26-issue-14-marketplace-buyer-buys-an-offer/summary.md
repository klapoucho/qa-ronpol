<!-- qa-pick summary · run 2026-11-26-issue-14-marketplace-buyer-buys-an-offer -->
## 🧪 QA: Marketplace: buyer buys an offer (UI) — ❌ FAIL

| | |
|---|---|
| **Run** | `2026-11-26-issue-14-marketplace-buyer-buys-an-offer` · 2026-11-26 |
| **Env** | http://localhost:3000 · Rolnopol 1.126.0 (Docker) · Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768 (one buy at 375x812) · API |
| **Tested** | issue #14 (no linked PR) |
| **Roles** | buyer, seller, rival buyer, observer, logged-out user (all fresh, non-round balances) · skipped: deleted account — deleting accounts hands their data to the next registration (critical known bug), the open bug is cited |
| **Reviewer** | GAPS CLOSED — 5 gaps closed (Financial page, own offer and logged-out gate in the UI, refusal console, ownership in the UI); 11 experiments, 9 held, 2 broke (minor) |
| **Automation** | 1 UI test on branch `test/ui-marketplace-buyer-buys-offer` — https://github.com/klapoucho/qa-ronpol/pull/34: runs alone in a new `ui-ledger` project because of problem 5; 10/10 stable, slow network passes, poisons 7/7 |

The buyer's own path works. Buy Now → "Confirm Purchase" → Buy Now gives "Purchase completed successfully!", the balance updates without a reload (40.17 → 16.72), the offer leaves Browse while a decoy stays, and Transaction History and the Financial page show the purchase. AC-5 holds through the API for a field and an animal group. No overdraft: one cent below the price is refused with 400 and nothing changes; an exact balance buys; two buys that together exceed the balance give one 200 and one 400.

**Why FAIL:** four known **major** bugs are reachable from the buyer's path, one of them (stored script in a field name) now also in the buyer's own Transaction History, and a new major one turned up while automating: under load the UI reports a failed purchase that the server completes and charges (5). The rest are minor UX problems.

### Problems

> [!CAUTION]
> **1. A field name with HTML runs as script on the buyer's Browse card — and, after the purchase, in the buyer's own Transaction History on every Marketplace load** · major (security, known bug, new surface) · `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`
>
> **Steps:** 1. A seller names a field `QA<img src=x onerror="document.title='QA-XSS-FIRED-T4'">` and lists it. 2. A buyer opens Browse (script runs). 3. The buyer buys it and reloads.<br>
> **Expected:** the name is shown as text everywhere.<br>
> **Actual:** the `<img>` is inserted and the script runs on the Browse card; after the purchase the history row `Purchase: QA…<img>` runs it again on every load, in the buyer's session. The confirmation modal escapes it.
>
> ![Browse card with an injected image in the field name](https://github.com/user-attachments/assets/05077a12-b702-495a-989e-9e75edee9dca)
> ![Buyer's Transaction History row with an injected image after the purchase](https://github.com/user-attachments/assets/36aff52a-9969-48b7-a856-5883579a7b58)

> [!CAUTION]
> **2. Seller is told "Offer cancelled successfully" while the buyer's purchase is running, and the sale goes through anyway** · major (known bug) · `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md`
>
> **Steps:** 1. Buyer confirms a purchase in the modal (a buy takes ~4 s). 2. 1.5 s later the seller cancels the offer.<br>
> **Expected:** either the cancel or the buy is refused.<br>
> **Actual:** cancel 200 "Offer cancelled successfully", then the buyer sees "Purchase completed successfully!"; the offer is `sold`, the buyer charged 6.06. Evidence: `artifacts/U21a-seller-cancels-during-ui-buy.json`

> [!CAUTION]
> **3. Buyer pays and gets nothing when the seller deletes the field during the purchase** · major (known bug) · `.qa/bugs/ghissue-11/post-api-marketplace-buy--field-deleted-during-buy.md`
>
> **Steps:** 1. Buyer confirms a purchase. 2. 1 s later the seller deletes the field.<br>
> **Expected:** the buy is refused with nothing charged.<br>
> **Actual:** "Purchase completed successfully!", buyer 11.10 → 6.05, seller credited, offer `sold`, the buyer owns no field. Evidence: `artifacts/U21b-seller-deletes-field-during-ui-buy.json`

> [!CAUTION]
> **4. While the confirmation is open, the seller can shrink the field — the buyer pays the listed price for 0.01 ha** · major (known bug) · `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md`
>
> **Steps:** 1. Seller lists a 42 ha field at 18.18. 2. Buyer opens Buy Now → "Confirm Purchase". 3. Seller sets the area to 0.01. 4. Buyer confirms.<br>
> **Expected:** the buy is refused, or the offer is withdrawn when the item changes.<br>
> **Actual:** 200; the buyer pays 18.18 and owns a 0.01 ha field. The modal says only `field #<id>`, so the buyer cannot notice. Evidence: `artifacts/U18-seller-edits-field-while-modal-open.json`

> [!CAUTION]
> **5. Under load the confirmation gives up after 15 s with "signal timed out", yet the buyer is charged and the offer sold** · major (found while automating) · `.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md`
>
> **Steps:** 1. Several money operations are queued (all incomes and purchases share one lock: ~2 s per income, ~4.2 s per buy). 2. Buyer confirms a purchase.<br>
> **Expected:** the UI shows the real outcome.<br>
> **Actual:** the page aborts the request at 15 s: error toast "signal timed out", balance still 40.17, offer still listed. The server completes the purchase 0.1 s later: buyer charged 23.45, offer `sold`. Seen in 3/10 and 7/10 runs of the new test at 4 workers. Evidence: `artifacts/writer/ui-buy-aborted-after-15s-but-completed.json`, `artifacts/writer/ui-buy-aborted-after-15s.jpeg`

> [!WARNING]
> **6. No progress during the ~4 s purchase, so the buyer can start it again and sees success, then an error** · minor · `.qa/bugs/ghissue-14/ui-marketplace-buy--no-loading-state-during-purchase.md`
>
> The modal closes at once; the card, its enabled Buy Now and the old balance stay for ~4 s. A second confirm sends a second buy: "Purchase completed successfully!" then "Offer not found or not available" (charged once).
>
> ![Browse during the purchase: the card is still there with an enabled Buy Now](https://github.com/user-attachments/assets/d267cb0c-851d-41c5-9bb8-ea245bf6352a)

> [!WARNING]
> **7. After a refused purchase the sold or cancelled offer stays in Browse with Buy Now, and the balance line is stale** · minor · `.qa/bugs/ghissue-14/ui-marketplace-browse--stale-after-refused-buy.md`
>
> Rival bought / seller cancelled / balance dropped while the modal was open: the refusals are right (404 / 400, nothing charged), but the card stays (still there 10 s later) and the balance shows 31.31 while the real one is 17.16.
>
> ![Error toast "Offer not found or not available" with the bought offer still listed](https://github.com/user-attachments/assets/3d3af4a3-3791-4957-b973-2898b5f016e2)

> [!WARNING]
> **8. "9 per page" shows 10 offers once the page size has been changed** · minor · `.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md`
>
> 18 → 36 → "9 per page": 10 cards and 2 pages instead of 9 and 3; the option's value is `10`. First load shows 9.
>
> ![Page 1 at "9 per page" ending with a tenth card](https://github.com/user-attachments/assets/f2eeb317-ec22-494d-ac1f-20326005be94)

> [!WARNING]
> **9. The confirmation and the buyer's history name the item "field #1822", not its name** · minor (extends known cosmetic bug) · `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md`
>
> `Are you sure you want to buy "field #1822" for 23.45 ROL?`; history shows `Purchase: field #1822` until a reload. Evidence: `artifacts/U2-confirm-modal.png`

> [!WARNING]
> **10. Header counters (Active, Trades) do not change after a purchase until a reload** · minor · `.qa/bugs/ghissue-14/ui-marketplace-header--counters-stale-after-buy.md`
>
> Header 1267 / 208 while the stats API already says 1266 / 209. Evidence: `artifacts/U4-reload-and-header.json`

> [!WARNING]
> **11. The confirmation ignores Escape, focus stays behind the overlay, no dialog role** · minor (accessibility) · `.qa/bugs/ghissue-14/ui-marketplace-buy--modal-ignores-escape-and-focus.md`
>
> Cancel, × and a backdrop click close it correctly. Evidence: `artifacts/U8-U11-modal-dismissals.json`

> [!WARNING]
> **12. After a purchase Browse jumps back to page 1** · minor · `.qa/bugs/ghissue-14/ui-marketplace-browse--back-to-page-one-after-buy.md`
>
> Filter and page size are kept. Evidence: `artifacts/U22-U23-paging-filter.json`

> [!WARNING]
> **13. Session ended during the purchase: straight to the login page with no message** · minor · `.qa/bugs/ghissue-14/ui-marketplace-buy--silent-redirect-on-ended-session.md`
>
> Nothing is charged (403). Evidence: `artifacts/U20-session-ended-while-modal-open.json`

> [!WARNING]
> **14. After the browser's Back, Browse lists unfiltered offers while the filter box still shows the search** · minor (reviewer) · `.qa/bugs/ghissue-14/ui-marketplace-browse--filter-ignored-after-back.md`
>
> Filter by a tag → Financial → Back: the box reads the tag, the list shows 9 unrelated demo offers (2/2).
>
> ![Filter box "rvw9550" above demo offers that do not match it](https://github.com/user-attachments/assets/0bbc85cb-f190-4bdd-b5e3-139cb93df5a1)

> [!WARNING]
> **15. A field bought a moment ago is missing from Create Offer until a reload** · minor (reviewer) · `.qa/bugs/ghissue-14/ui-marketplace-create--bought-field-missing-until-reload.md`
>
> The API already has it with the buyer. Evidence: `artifacts/review/R10-create-offer-dropdown-after-buy.json`

> [!WARNING]
> **16. Creating several fields at once as one user answers every request with the last field's id** · minor (API, found while automating) · `.qa/bugs/ghissue-14/post-api-fields--concurrent-creates-return-same-id.md`
>
> Three parallel `POST /api/v1/fields` → three 201s, all `id: 1930` with the third name; 1928–1930 are stored. Evidence: `artifacts/writer/post-fields-concurrent-same-user-ids.json`

> [!NOTE]
> **17. Marketplace money drops trailing zeros ("31.3 ROL", "20.2 ROL", "0 ROL"); Financial page and header use other formats ("20,20 ROL", "508 163,38")** · cosmetic · `.qa/bugs/ghissue-14/ui-marketplace-browse--balance-without-fixed-decimals.md`

### Not verified

- Deleted account's token on buy — not re-run (deleting accounts hands their data to the next registration); the open bug `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` stands.
- Slow-network throttling — not applied manually; the buy itself takes ~4.2 s, which already shows the missing loading state (6).

<details>
<summary><b>Test cases</b> — 35 ✅ · 13 ❌ · 1 ⏭️ (U… UI, A… API, K… known bugs, R… reviewer experiments)</summary>

| # | | Role | Case | Requirement | Evidence |
|---|---|---|---|---|---|
| U1 | ✅ | buyer B1m | Browse filtered to the run shows the offer and the decoy; balance 40.17 ROL | AC-4 | `artifacts/U1-U3-main-buy.json` |
| U2 | ✅ | buyer B1m | Buy Now opens Confirm Purchase with price and Cancel / Buy Now | AC-4 | `artifacts/U2-confirm-modal.png` |
| U3 | ✅ | buyer B1m | Confirm: one POST, 200, success toast, balance 16.72 without reload, offer gone, decoy stays, history entry | AC-4, AC-5 | `artifacts/U1-U3-main-buy.json` |
| U3a | ✅ | buyer + seller | AC-5 read-back through both users' API (balances, field owner, offer sold, both histories) | AC-5 | `artifacts/U1-U3-main-buy.json` |
| U3c | ✅ | seller S1m | Seller's My Offers shows Sold, history shows the sale | AC-5 | `artifacts/U3c-seller-view-after-sale.json` |
| U4 | ✅ | buyer B1m | Reload keeps balance and history; header counters stale before reload | AC-5 | `artifacts/U4-reload-and-header.json` |
| U5 | ✅ | buyer B1 | Animal group bought in the UI moves to the buyer, balances change by 7.07 | AC-4, AC-5 | `artifacts/U5-animal-buy.json` |
| U6 | ✅ | buyer B3 | One cent below the price: 400 insufficient funds, error toast, nothing changes | AC-4 | `artifacts/U6-one-cent-below.json` |
| U7 | ✅ | buyer B2 | Exact balance buys the same offer, balance 0 | AC-4 | `artifacts/U7-exact-balance.json` |
| U8 | ✅ | buyer B5 | Modal Cancel closes without a request | assumption | `artifacts/U8-U11-modal-dismissals.json` |
| U9 | ✅ | buyer B5 | Modal close (x) closes without a request | assumption | `artifacts/U8-U11-modal-dismissals.json` |
| U10 | ✅ | buyer B5 | Backdrop click closes without a request | assumption | `artifacts/U8-U11-modal-dismissals.json` |
| U11 | ❌ | buyer B5 | Escape closes the modal; focus inside the modal | user expectation (a11y) | `artifacts/U11-escape-modal-still-open.png` |
| U12 | ✅ | buyer B5 | Cancel offer X, confirm offer Y: only Y bought | AC-4 | `artifacts/U12-cancel-x-then-buy-y.json` |
| U13 | ✅ | buyer B5 | Double-click on modal confirm sends one request | user expectation | `artifacts/U13-double-click-confirm.json` |
| U14 | ❌ | buyer B5 | Loading state during the ~4 s buy; no second purchase attempt | user expectation | `artifacts/U14-buy-again-while-first-buy-runs.json` |
| U15 | ✅ | buyer B5, rival B4 | Rival buys while the modal is open: 404, nothing charged (stale card remains) | AC-4 | `artifacts/U15-rival-buys-while-modal-open.json` |
| U16 | ✅ | buyer B5, seller S2 | Seller cancels while the modal is open: 404, nothing charged | AC-4 | `artifacts/U16-seller-cancels-while-modal-open.json` |
| U17 | ✅ | buyer B5 | Balance drops below the price while the modal is open: 400, no overdraft | AC-4 | `artifacts/U17-balance-drops-while-modal-open.json` |
| U18 | ❌ | buyer B5, seller S2 | Seller shrinks the field while the modal is open (known bug) | user expectation | `artifacts/U18-seller-edits-field-while-modal-open.json` |
| U19 | ✅ | buyer B5, seller S2 | Seller deletes the field while the modal is open: offer unavailable, 404, nothing charged | AC-4 | `artifacts/U19-seller-deletes-field-while-modal-open.json` |
| U20 | ✅ | buyer B6 | Session ended while the modal is open: 403, login page, nothing moved | AC-4 | `artifacts/U20-session-ended-while-modal-open.json` |
| U21a | ❌ | buyer B5, seller S2 | Seller cancels during the UI buy (known bug) | AC-4 | `artifacts/U21a-seller-cancels-during-ui-buy.json` |
| U21b | ❌ | buyer B5, seller S2 | Seller deletes the field during the UI buy (known bug) | AC-5 | `artifacts/U21b-seller-deletes-field-during-ui-buy.json` |
| U22 | ✅ | buyer B1m | Filter and 9/18/36 paging before and after a buy from page 2 | story context (9/18/36) | `artifacts/U22-U23-paging-filter.json` |
| U22b | ❌ | buyer B1m | "9 per page" after changing the size shows 9 cards | story context (9/18/36) | `artifacts/U22-9-per-page-shows-10.png` |
| U23 | ✅ | buyer B1m | Item Type filter after a buy matches the API count | story context (type filter) | `artifacts/U22-U23-paging-filter.json` |
| U24 | ✅ | buyer B6 | Modal centred at 1366 and 375 px | assumption (visual) | `artifacts/U24-modal-geometry.json` |
| U25 | ❌ | buyer B6, seller S4 | Field-name HTML on the Browse card and in the buyer's history (known bug) | security | `artifacts/U25-field-name-html-browse-and-history.json` |
| U26 | ❌ | buyer B6 | Known cosmetic bugs on the buyer's Browse (heading id, status dot, long word) | known bugs | `artifacts/U26-known-cosmetic-rechecks.json` |
| A1a | ✅ | seller S2 | Own offer: 400 Cannot buy your own offer, nothing changed | AC-4 | `artifacts/A1a-own-offer.json` |
| A1b | ✅ | rival B4 | Sold offer: 404, nothing changed | AC-4 | `artifacts/A1b-sold-offer-again.json` |
| A2 | ✅ | logged-out user | Logged-out token refused on buy (403, known: 401 expected), nothing changed | auth | `artifacts/A2-logged-out-token-buy.json` |
| A3 | ✅ | anonymous | Invalid token 403 (known), missing token 401 | auth | `artifacts/A3-invalid-and-missing-token.json` |
| A4 | ⏭️ | deleted account | Deleted-account token on buy | auth | `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` |
| K1 | ❌ | buyer B4, seller S3 | Animals added to the field during a buy (known bug) | known bug | `artifacts/A5a-animals-added-during-buy.json` |
| K2 | ❌ | buyer B4, seller S3 | Seller staff assignment survives the sale (known bug) | known bug | `artifacts/A5b-seller-assignment-after-sale.json` |
| K3 | ❌ | seller S2 | Unavailable offer cannot be cancelled (known bug) | known bug | `artifacts/K-unavailable-offer-cannot-be-cancelled.json` |
| R1 | ✅ | buyer, seller | Financial page after UI buys shows the buyer's expenses and the seller's incomes matching the API | AC-5 | `artifacts/review/R1-financial-page-buyer-and-seller.json` |
| R2 | ✅ | buyer | Buyer's own active offer is absent from their Browse; another user sees it | AC-4 | `artifacts/review/R2-own-offer-in-browse.json` |
| R3 | ✅ | logged-out | Logged-out direct URL /marketplace.html redirects to login, no API calls | auth | `artifacts/review/R3-R6-direct-url-and-back.json` |
| R4a | ✅ | buyer | Two offers bought back to back in the UI: final balance shown equals the API | AC-4, AC-5 | `artifacts/review/R4a-two-offers-back-to-back.json` |
| R4b | ✅ | buyer | Two concurrent UI buys exceeding the balance: 200 + 400, no overdraft | AC-4 | `artifacts/review/R4b-two-offers-exceed-balance.json` |
| R5 | ✅ | buyer, rival | Refused buy twice: 404 + toast, nothing charged, console only expected 404s | AC-4 | `artifacts/review/R5-refusal-console-and-retry.json` |
| R6 | ❌ | buyer | Browser Back from Financial keeps Browse filtered as the filter box says | user expectation | `artifacts/review/R6b-back-repeat.json` |
| R8 | ✅ | buyer | Full buy at 375x812 | AC-4, AC-5 | `artifacts/review/R8-mobile-buy.json` |
| R9 | ✅ | buyer, seller | After a fresh load, bought fields are in the buyer's Create Offer list and gone from the seller's | AC-5 | `artifacts/review/R9-ownership-in-create-offer-dropdown.json` |
| R10 | ❌ | buyer | Without reload, Create Offer lists the just-bought field | user expectation | `artifacts/review/R10-create-offer-dropdown-after-buy.json` |
| R11 | ✅ | seller | HTML in displayedName refused on register and profile update | security | `artifacts/review/R11-seller-name-html-api.json` |

</details>

<details>
<summary><b>Known bugs re-checked</b></summary>

- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` — still reproduces; new surface: buyer's Transaction History
- `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md` — still reproduces (UI buy)
- `.qa/bugs/ghissue-11/post-api-marketplace-buy--field-deleted-during-buy.md` — still reproduces (UI buy)
- `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md` — still reproduces (while the modal is open)
- `.qa/bugs/ghissue-11/post-api-marketplace-buy--animals-added-during-buy.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-marketplace-buy--seller-assignment-survives-sale.md` — still reproduces
- `.qa/bugs/ghissue-11/post-api-auth-token--invalid-token-403.md` — still reproduces (a logged-out token also gets 403)
- `.qa/bugs/ghissue-12/delete-api-marketplace-offers--unavailable-offer-stuck.md` — still reproduces
- `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md` — still reproduces; also in the confirmation and history
- `.qa/bugs/ghissue-13/ui-marketplace-browse--status-dot-over-price.md` — still reproduces
- `.qa/bugs/ghissue-13/ui-marketplace-browse--long-description-word-overflows.md` — still reproduces in the buyer's Browse
- `.qa/bugs/ghissue-13/ui-marketplace-tabs--mobile-tab-bar-overflows.md` — still reproduces (375 px)
- `.qa/bugs/ghissue-13/ui-marketplace-create--dropdown-lists-offered-items.md` — still reproduces
- `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` — not re-run (see Not verified)

</details>

<details>
<summary><b>Run notes</b> — agents, lessons applied</summary>

- **Agents:** QA tester — Opus 5.5, default effort — exploratory UI+API testing of a money-moving flow; QA reviewer — Opus 5.5, fresh context — coverage check and break attempts; test writer — Opus 5.5, own worktree — one UI test from the handoff (two user decisions on the 4-worker flake: isolate money UI tests in a `ui-ledger` project; seller funded again once isolated); test reviewer — Opus 5.5, fresh context, 7 fixes and 5 human decisions.
- **Lessons applied** (https://github.com/klapoucho/qa-ronpol/pull/35):
  - tester times money operations alone and in parallel and records the page's request timeout in the handoff; an app-caused flake is filed and isolated, never worked around;
  - handoff template asks for seed calls that must not run in parallel, write timings and large responses;
  - money-moving scripts check state before each write and save after every step (the tester's script bought twice before crashing);
  - `.qa/notes/playwright-cli.md`: no DOM globals in `run-code`; screenshots right after `waitFor()` can catch a modal mid-animation.

</details>

<sub>Posted by <code>/qa-pick</code> · full evidence in <code>.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/</code> · 🤖 Generated with [Claude Code](https://claude.com/claude-code)</sub>

