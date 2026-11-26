# Marketplace: buyer buys an offer (UI) — FAIL

**Source:** https://github.com/klapoucho/qa-ronpol/issues/14 (no linked PR) · **Run:** 2026-11-26-issue-14-marketplace-buyer-buys-an-offer · **Env:** http://localhost:3000 · **Platforms:** Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768 (one check at 375x812); API (Node fetch, `X-Synthetic-Token`) · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Date:** 2026-11-26
**Review:** GAPS CLOSED — 11 experiments, 9 held, 2 broke (findings 14, 15); finding 13 corrected (`review.md`).
**Roles tested:** buyer (fresh users B1, B1m, B2, B3, B5, B6), seller (S1, S1m, S2, S3, S4), rival buyer B4, observer O, logged-out user. All registered for this run and funded with non-round amounts. · **Skipped:** deleted account. The memory rule "never delete accounts in parallel runs" applies, so the known bug's evidence is cited instead. No admin role is involved in buying.

The buyer's path works. In Browse, Buy Now opens "Confirm Purchase" and Buy Now confirms it. The toast reads "Purchase completed successfully!". The balance updates without a reload (40.17 → 16.72). The offer leaves Browse while the decoy offer stays, and Transaction History shows the purchase. Through the API, AC-5 holds for a field and for an animal group, and the refusals hold: one cent below the price, an exact-balance buy, your own offer, a sold offer, and no or a logged-out token.

**Why FAIL:** four known major bugs are still reachable from the buyer's UI path, and the test writer found a new major one: under load the page gives up on a purchase after 15 s and shows an error, while the server completes it and charges the buyer (problem 5). The field-name HTML bug now also runs in the buyer's own Transaction History after the purchase. If the seller cancels or deletes the field while the UI buy is running, the buy still goes through, and the buyer can be charged for nothing. A seller can also shrink the field while the buyer's confirmation modal is open. The other findings are minor: no loading state, stale state after a refusal, the "9 per page" option shows 10, stale header counters and modal accessibility.

## Problems (user-facing)

### 1. A field name with HTML runs as script on the buyer's Browse card, and after the purchase in the buyer's own Transaction History on every Marketplace load — major (security, known bug, new surface)
- **Steps:** 1. Seller S4 creates a field named `QA<tag><img src=x onerror="document.title='QA-XSS-FIRED-T4'">` and lists it at 2.22. 2. Buyer B6 opens Marketplace → Browse and filters to the offer. 3. B6 buys it (Buy Now → Buy Now) and reloads the page.
- **Expected:** the name is shown as text everywhere.
- **Actual:** In Browse, the `<img>` is inserted into the card and the page title becomes `QA-XSS-FIRED-T4`. After the purchase and a reload, the offer is no longer in Browse (`browseHasXssCard: false`). The buyer's Transaction History now renders `Purchase: QAt4run8955<img …>` as HTML (one `<img>` in the list), and the payload runs again: the title is `QA-XSS-FIRED-T4`. The history builds the name from the buyer's own fields, so after buying such a field the script runs in the buyer's session on every Marketplace load. The confirmation modal escapes the name, but it shows `field #1818`.
- **Evidence:** `artifacts/U25-field-name-html-browse-and-history.json`, `artifacts/U25a-field-name-html-on-browse-card.png`, `artifacts/U25b-field-name-html-in-buyer-history.png`, `artifacts/console-14-b6-xss.txt` (the two 404s for `/x` are the payload's image).
- **Known bug:** `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`. The new surface is the buyer's Transaction History.

### 2. Seller is told "Offer cancelled successfully" while the buyer's UI purchase is running, and the sale goes through anyway — major (known bug)
- **Steps:** 1. B5 confirms the purchase of S2's offer (6.06) in the modal. 2. About 1.5 s later, while the buy is still running (it takes about 4 s), S2 calls `DELETE /api/v1/marketplace/offers/{id}`.
- **Expected:** either the cancel or the buy is refused.
- **Actual:** the cancel returns 200 "Offer cancelled successfully". The buyer then sees "Purchase completed successfully!". The offer ends `sold`, B5 is charged 6.06 and owns the field.
- **Evidence:** `artifacts/U21a-seller-cancels-during-ui-buy.json`
- **Known bug:** `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md` (1 of 1 here).

### 3. Buyer pays and gets nothing when the seller deletes the field during the UI purchase — major (known bug)
- **Steps:** 1. B5 confirms the purchase of S2's field offer (5.05). 2. About 1 s later, S2 calls `DELETE /api/v1/fields/{id}`.
- **Expected:** the buy is refused with nothing charged, or the payment is reversed.
- **Actual:** the buyer sees "Purchase completed successfully!". B5's balance drops from 11.10 to 6.05 and S2 receives 5.05. The offer is `sold`, but B5's `/fields` does not contain the field.
- **Evidence:** `artifacts/U21b-seller-deletes-field-during-ui-buy.json`
- **Known bug:** `.qa/bugs/ghissue-11/post-api-marketplace-buy--field-deleted-during-buy.md` (1 of 1 here).

### 4. While the buyer's confirmation modal is open, the seller can shrink the field, and the buyer pays the listed price for 0.01 ha — major (known bug)
- **Steps:** 1. S2 lists a 42 ha field at 18.18. 2. B5 opens Buy Now → "Confirm Purchase". 3. S2 calls `PUT /api/v1/fields/{id} { area: 0.01 }` (200). 4. B5 clicks Buy Now in the modal.
- **Expected:** the buy is refused, or the offer is withdrawn when the item changes.
- **Actual:** the buy returns 200. B5 pays 18.18 (49.49 → 31.31) and owns a field of 0.01 ha. The modal names only `field #<id>`, so the buyer cannot notice the change.
- **Evidence:** `artifacts/U18-seller-edits-field-while-modal-open.json`. The seed area of 42 is in `artifacts/seed-summary.json` under `items.editmid`. The card's area text was not captured for this case.
- **Known bug:** `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md`

### 5. Under load the Buy Now confirmation gives up after 15 s with "signal timed out", yet the buyer is charged and the offer is sold — major (found by the test writer)
- **Steps:** 1. Several money operations are queued (one global ledger lock: ~2.0 s per income, ~4.2 s per buy). 2. Buyer confirms a purchase in the modal.
- **Expected:** the UI shows the real outcome.
- **Actual:** `POST /api/v1/marketplace/buy` is aborted by the page after 15011 ms (no response); toast "signal timed out", balance 40.17, offer still listed. The server records the purchase at +15.1 s: buyer 16.72, seller 40.88, offer `sold`. 3/10 and 7/10 runs of the new test at 4 workers (seller funded).
- **Evidence:** `artifacts/writer/ui-buy-aborted-after-15s-but-completed.json`, `artifacts/writer/ui-buy-aborted-after-15s.jpeg`, `artifacts/writer/ui-buy-confirmed.jpeg`
- **Bug:** `.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md`

### 6. No loading state during the ~4 s purchase, so a second click buys again and the user sees success and then an error — minor
- **Steps:** 1. B5 confirms a purchase in the modal. 2. During the buy, B5 clicks the same card's Buy Now again and confirms.
- **Expected:** while the purchase runs, the user sees progress and cannot start it again.
- **Actual:** the modal closes at once. For about 4.2 s nothing shows the purchase is running. The card stays, its Buy Now button is enabled, there is no spinner, and the balance is unchanged. The second confirm sends a second `POST /marketplace/buy`. The user then sees "Purchase completed successfully!" and 5 ms later "Offer not found or not available". The buyer was charged only once.
- **Evidence:** `artifacts/U14-buy-again-while-first-buy-runs.json` (`midState`, 2 POSTs, toasts), `artifacts/U14-during-buy-no-feedback.png`

### 7. After a refused purchase, Browse and the balance are not refreshed — minor
- **Steps:** with B5's modal open: (a) rival B4 buys the offer through the API; (b) the seller cancels it; (c) B5 spends money elsewhere, so the balance is 17.16 against a price of 17.17. Then B5 confirms.
- **Expected:** the refusal message, then the current state: the offer is removed from Browse and the balance is the real one.
- **Actual:** the refusals are correct and nothing is charged. (a) and (b) give 404 "Offer not found or not available" and (c) gives 400 "Insufficient funds…". But the sold or cancelled card stays in Browse with an enabled Buy Now. In (a) it was still there 10 s later. The balance line still shows 31.31 ROL while the real balance is 17.16.
- **Evidence:** `artifacts/U15-rival-buys-while-modal-open.json`, `artifacts/U15-rival-bought-while-modal-open.png`, `artifacts/U16-seller-cancels-while-modal-open.json`, `artifacts/U17-balance-drops-while-modal-open.json`, `artifacts/U17-balance-dropped-while-modal-open.png`

### 8. "9 per page" shows 10 offers per page after the page size was changed — minor
- **Steps:** 1. Browse, filtered to 20 offers. 2. Choose 18 per page, then 36, then "9 per page" again.
- **Expected:** 9 cards per page, 3 pages, as on first load.
- **Actual:** 10 cards per page and 2 pages. The option labelled "9 per page" has the value `10`. On first load the page size is 9, and 9 cards show.
- **Evidence:** `artifacts/U22-U23-paging-filter.json` (`f9_page1`: 9 cards; `f9again_page1`: 10 cards, `size: 10`), `artifacts/U22-9-per-page-shows-10.png`

### 9. The confirmation and the buyer's history name the item "field #1822", not its name — minor (extends a known cosmetic bug)
- **Steps:** Buy Now on any other user's offer.
- **Expected:** the confirmation names what is being bought (the field name and area, or the animal type and amount), as the card's details line does.
- **Actual:** `Are you sure you want to buy "field #1822" for 23.45 ROL?` (an animal shows as `"animal #1466"`). Transaction History shows `Purchase: field #1822` until a reload, then the field name. The seller's history keeps `Sale: field #1822`.
- **Evidence:** `artifacts/U1-U3-main-buy.json` (`U2_modal`, `U3_historyTab`), `artifacts/U2-confirm-modal.png`, `artifacts/U5-animal-buy.json`, `artifacts/U4-reload-and-header.json` (`reload.history`), `artifacts/U3c-seller-view-after-sale.json`
- **Related known bug:** `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md`

### 10. The header counters do not change after a purchase until a reload — minor
- **Steps:** buy an offer, then look at the Marketplace header.
- **Expected:** "Active" drops by one and "Trades" rises by one.
- **Actual:** after the purchase the header still shows 1267 / 208, while `GET /financial/marketplace-stats` at the same moment returns 1266 / 209. After a reload it shows 1266 / 209.
- **Evidence:** `artifacts/U4-reload-and-header.json`

### 11. The confirmation modal ignores Escape and does not take keyboard focus — minor (accessibility)
- **Steps:** open Buy Now → "Confirm Purchase", press Escape, then press Tab twice.
- **Expected:** Escape closes the modal and focus stays inside it. The modal is announced as a dialog.
- **Actual:** the modal stays open. Focus stays on the card's Buy Now button behind the overlay, and Tab moves to the pagination buttons behind it. The modal has no `role="dialog"` and no `aria-modal`. Cancel, ×, and a click on the backdrop do close it without a request (U8–U10).
- **Evidence:** `artifacts/U8-U11-modal-dismissals.json`, `artifacts/U11-escape-modal-still-open.png`

### 12. After a purchase Browse jumps back to page 1 — minor
- **Steps:** Browse filtered to 20 offers, 18 per page; on page 2 buy an offer.
- **Expected:** the user stays on page 2, or at least near the bought offer.
- **Actual:** the filter and the page size are kept (19 results, 2 pages), but the view returns to page 1.
- **Evidence:** `artifacts/U22-U23-paging-filter.json` (`beforeBuy_f18_page2` and `afterBuy`), `artifacts/U22-after-buy-back-on-page1.png`

### 13. When the session ends during the purchase, the user lands on the login page with no explanation — minor
- **Steps:** B6 opens the confirmation. The same token is logged out (`POST /logout`, as from another tab). B6 confirms.
- **Expected:** a message that the session ended, with nothing charged.
- **Actual:** nothing is charged: the buy returns 403, the offer stays `active` and the balance stays 17.98. The page jumps straight to `/login.html` with no message.
- **Evidence:** `artifacts/U20-session-ended-while-modal-open.json`, `artifacts/U20-after-confirm-with-ended-session.png`

### 14. After the browser's Back button, Browse lists unfiltered offers while the filter box still shows the search — minor (review N1)
- **Steps:** 1. Browse, type a run tag in the filter; only the matching offer shows. 2. Open the Financial page. 3. Press Back.
- **Expected:** Browse matches the text in the filter box, or the box is empty.
- **Actual:** the box still reads the tag, but Browse lists 9 unfiltered demo offers. Typing any character re-applies the filter. 2 of 2.
- **Evidence:** `artifacts/review/R6-back-from-financial.png`, `artifacts/review/R6b-back-repeat.json`
- **Bug:** `.qa/bugs/ghissue-14/ui-marketplace-browse--filter-ignored-after-back.md`

### 15. A field bought a moment ago is missing from Create Offer until the page is reloaded — minor (review N2)
- **Steps:** 1. Buy a field offer in Browse. 2. Without reloading, open Create Offer, Item Type "field".
- **Expected:** the field just bought is listed (the API already has it with the buyer).
- **Actual:** the buyer's earlier fields are listed, the new one is not. After a reload it is.
- **Evidence:** `artifacts/review/R10-create-offer-dropdown-after-buy.json`, `artifacts/review/R10-create-offer-after-buy-no-reload.png`
- **Bug:** `.qa/bugs/ghissue-14/ui-marketplace-create--bought-field-missing-until-reload.md`

### 16. Creating several fields at once as one user answers every request with the last field's id — minor (API, found by the test writer)
- **Steps:** three parallel `POST /api/v1/fields` by one user.
- **Expected:** three different ids, each with its own name.
- **Actual:** three 201s with `id: 1930` and the third name; 1928–1930 stored. Sequential creates and two different users are fine.
- **Evidence:** `artifacts/writer/post-fields-concurrent-same-user-ids.json`
- **Bug:** `.qa/bugs/ghissue-14/post-api-fields--concurrent-creates-return-same-id.md`

### 17. Marketplace money amounts drop trailing zeros ("31.3 ROL", "20.2 ROL", "0 ROL"), and each screen formats money its own way — cosmetic (corrected by review N3)
- **Actual:** balance "31.3 ROL" next to a "31.31 ROL" card, "0 ROL" after an exact-balance buy, card price "20.2 ROL", history "-20.2 ROL". The Financial page shows "+20,20 ROL" and the header "508 163,38".
- **Evidence:** `artifacts/U6-one-cent-below-error-toast.png`, `artifacts/U7-exact-balance.json` (`confirm.browse.balance: "0 ROL"`), `artifacts/review/R4a-back-to-back-end.png`, `artifacts/review/R4b-two-offers-exceed-balance.json`, `artifacts/review/R1-financial-page-buyer-and-seller.json`
- **Bug:** `.qa/bugs/ghissue-14/ui-marketplace-browse--balance-without-fixed-decimals.md`

## Test cases
| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| U1 | PASS | buyer B1m | playwright-cli | Browse filtered to the run: S1m's offer 1707 (23.45) and decoy 1708 (23.54) both show; balance "40.17 ROL" | AC-4 | artifacts/U1-U3-main-buy.json (`U1_browseBefore`), artifacts/U1-browse-before-buy.png |
| U2 | PASS (finding 9) | buyer B1m | playwright-cli | Buy Now → modal "Confirm Purchase", message has price 23.45, buttons Cancel / Buy Now | AC-4 | artifacts/U2-confirm-modal.png, U1-U3-main-buy.json (`U2_modal`) |
| U3 | PASS | buyer B1m | playwright-cli | Confirm → exactly one `POST /buy {offerId:1707}` → 200; toast "Purchase completed successfully!"; balance "16.72 ROL" without reload (40.17−23.45, float trap); 1707 gone, decoy 1708 stays; Transaction History "Purchase: field #1822 … -23.45 ROL" | AC-4, AC-5 | artifacts/U1-U3-main-buy.json (`U3_confirm`, `U3_historyTab`), artifacts/U3-after-confirm.png, artifacts/U3b-transaction-history.png |
| U3a | PASS | buyer + seller | API | AC-5 read-back. Before: offer active, field with S1m, histories empty. After: buyer 16.72, seller 40.88 (17.43+23.45), field 1822 in B1m's `/fields` and not S1m's, offer `sold`, transaction 209 in both marketplace histories, buyer `expense 23.45 Marketplace purchase`, seller `income 23.45 Marketplace sale`, decoy still active, observer's history empty | AC-5 | artifacts/U1-U3-main-buy.json (`apiBefore`, `apiAfter`, `observerHistory*`) |
| U3c | PASS | seller S1m | playwright-cli | Seller's My Offers card "field #1822 (Sold)", Cancel disabled; history "Sale: … +23.45 ROL" | AC-5 | artifacts/U3c-seller-view-after-sale.json, artifacts/U3c-seller-my-offers-sold.png |
| U4 | PASS (findings 9, 10) | buyer B1m | playwright-cli | Reload: balance 16.72 and the history entry persist (now with the field name); header counters stale before the reload | AC-5 | artifacts/U4-reload-and-header.json, artifacts/U4-history-after-reload.png |
| U5 | PASS | buyer B1 | playwright-cli + API | Animal group pig ×2 at 7.07: 200; balance 16.72 → 9.65 shown; animal 1466 moves to B1; S1 40.88 → 47.95; offer `sold` | AC-4, AC-5 | artifacts/U5-animal-buy.json, artifacts/U5-animal-after-buy.png |
| U6 | PASS | buyer B3 | playwright-cli + API | Balance 31.30, price 31.31: 400 "Insufficient funds to complete purchase (no overdraft allowed)", error toast, balance shown 31.3, card stays; API snapshot identical before/after | AC-4 | artifacts/U6-one-cent-below.json, artifacts/U6-one-cent-below-error-toast.png |
| U7 | PASS (finding 17) | buyer B2 | playwright-cli + API | Balance 31.31 buys the same offer: 200, "0 ROL" shown, S2 12.34 → 43.65, field moves | AC-4 boundary | artifacts/U7-exact-balance.json, artifacts/U7-exact-balance-after-buy.png |
| U8 | PASS | buyer B5 | playwright-cli | Modal Cancel → closed, no buy request | assumption (dismissal) | artifacts/U8-U11-modal-dismissals.json (`U8_cancel`) |
| U9 | PASS | buyer B5 | playwright-cli | Modal × → closed, no request | assumption | same file (`U9_close_x`) |
| U10 | PASS | buyer B5 | playwright-cli | Click on the backdrop → closed, no request | assumption | same file (`U10_backdrop`) |
| U11 | FAIL (finding 11) | buyer B5 | playwright-cli | Escape → modal stays open; focus behind the overlay | user expectation (a11y) | same file (`U11_escape`), artifacts/U11-escape-modal-still-open.png |
| U8–11 API | PASS | buyer B5 | API | After all four dismissals: offer active, B5 88.88, no history | AC-4 | U8-U11-modal-dismissals.json (`apiBefore`/`apiAfter`) |
| U12 | PASS | buyer B5 | playwright-cli + API | Open X (12.21), Cancel; open Y (12.12), confirm → the only POST has `offerId` 1672 (Y); X stays active, Y sold | AC-4 (right one) | artifacts/U12-cancel-x-then-buy-y.json |
| U13 | PASS | buyer B5 | playwright-cli + API | Double-click on the modal's Buy Now → one POST, one charge (88.88 → 75.75) | user expectation | artifacts/U13-double-click-confirm.json |
| U14 | FAIL (finding 6) | buyer B5 | playwright-cli | Buy Now again during the 4 s buy → second POST, success then error toast; one charge | user expectation | artifacts/U14-buy-again-while-first-buy-runs.json, artifacts/U14-during-buy-no-feedback.png, artifacts/U14-after-second-confirm.png |
| U15 | PASS / finding 7 | buyer B5, rival B4 | playwright-cli + API | Rival buys while the modal is open → 404 "Offer not found or not available", B5 not charged (49.49), rival owns the field; stale card stays | AC-4 | artifacts/U15-rival-buys-while-modal-open.json, artifacts/U15-rival-bought-while-modal-open.png |
| U16 | PASS / finding 7 | buyer B5, seller S2 | playwright-cli + API | Seller cancels while the modal is open → 404, nothing charged; stale card stays | AC-4 | artifacts/U16-seller-cancels-while-modal-open.json, artifacts/U16-seller-cancelled-while-modal-open.png |
| U17 | PASS / finding 7 | buyer B5 | playwright-cli + API | Balance drops to 17.16 (price 17.17) while the modal is open → 400 insufficient, no overdraft, offer active; UI still shows 31.31 | AC-4 | artifacts/U17-balance-drops-while-modal-open.json, artifacts/U17-balance-dropped-while-modal-open.png |
| U18 | FAIL (finding 4, known) | buyer B5, seller S2 | playwright-cli + API | Seller shrinks the field to 0.01 ha while the modal is open → buy 200, buyer pays 18.18 for 0.01 ha | user expectation | artifacts/U18-seller-edits-field-while-modal-open.json |
| U19 | PASS | buyer B5, seller S2 | playwright-cli + API | Seller deletes the field while the modal is open → offer `unavailable`, buy 404, nothing charged | AC-4 | artifacts/U19-seller-deletes-field-while-modal-open.json, artifacts/U19-seller-deleted-field-while-modal-open.png |
| U20 | PASS / finding 13 | buyer B6 | playwright-cli + API | Session logged out while the modal is open → buy 403, sent to `/login.html`, offer active, balance 17.98 unchanged | AC-4 | artifacts/U20-session-ended-while-modal-open.json, artifacts/U20-after-confirm-with-ended-session.png |
| U21a | FAIL (finding 2, known) | buyer B5, seller S2 | playwright-cli + API | Seller cancels 1.5 s into the UI buy → cancel 200 and buy 200, offer sold | AC-4 / AC-7 of #12 | artifacts/U21a-seller-cancels-during-ui-buy.json |
| U21b | FAIL (finding 3, known) | buyer B5, seller S2 | playwright-cli + API | Seller deletes the field 1 s into the UI buy → buyer charged 5.05, owns nothing | AC-5 | artifacts/U21b-seller-deletes-field-during-ui-buy.json |
| U22 | PASS / findings 8, 12 | buyer B1m | playwright-cli + API | 20 tagged offers: 9/page → 9, 9, 2; 18 → 18, 2; 36 → 20; bought pg19 from page 2 (18/page) → filter and size kept, 19 results (API: 19), page 2 has 1 card; back on page 1; "9 per page" later gives 10 | story (9/18/36) | artifacts/U22-U23-paging-filter.json, artifacts/U22-page3-at-9.png, artifacts/U22-9-per-page-shows-10.png, artifacts/U22-after-buy-back-on-page1.png |
| U23 | PASS | buyer B1m | playwright-cli + API | After the buy, filter on Item Type "animal" → 541 filtered = 541 animal offers in the API browse; all cards on the page are animals | story (type filter) | artifacts/U22-U23-paging-filter.json (`typeAnimal*`, `apiBrowseCounts`) |
| U24 | PASS | buyer B6 | playwright-cli | Modal centred at 1366x768: gaps 483/483 px horizontal, 262.4/262.4 px vertical, buttons on one line; at 375 px gaps 18.75/18.75 | assumption (visual) | artifacts/U24-modal-geometry.json, artifacts/U24-modal-geometry-1366.png, artifacts/U24-modal-geometry-375.png |
| U25 | FAIL (finding 1, known) | buyer B6, seller S4 | playwright-cli + API | Field-name HTML runs on the Browse card and in the buyer's history after the purchase | security | artifacts/U25-field-name-html-browse-and-history.json, artifacts/U25a-…png, artifacts/U25b-…png |
| U26 | FAIL (known cosmetic) | buyer B6 | playwright-cli | Buyer's Browse: long word → document 2246 px wide in a 1366 px viewport; status dot overlaps the price on 3 of 3 cards; headings `field #<id>` | known bugs | artifacts/U26-known-cosmetic-rechecks.json, artifacts/U26a-long-word-overflow-buyer-browse.png, artifacts/U26b-status-dot-and-heading.png |
| A1a | PASS | seller S2 | API | Own offer (seller 127.48 > price 12.21) → 400 "Cannot buy your own offer"; snapshot unchanged | AC-4 / #12 AC-6 | artifacts/A1a-own-offer.json |
| A1b | PASS | rival B4 | API | Already-sold offer → 404 "Offer not found or not available"; nothing changed | AC-4 | artifacts/A1b-sold-offer-again.json |
| A2 | PASS (known 403) | logged-out user | API | Token reads the account (200) before logout; after logout, buy → 403 "Invalid or expired token"; nothing changed | AC-4 (auth) | artifacts/A2-logged-out-token-buy.json |
| A3 | PASS (known 403) | anonymous | API | `Bearer not-a-token` → 403; no token → 401 "Access token required"; offer untouched | auth | artifacts/A3-invalid-and-missing-token.json |
| A4 | NOT_RUN | deleted account | — | Deleted-account token on buy | auth | not run, see "Not verified" |
| K1 | FAIL (known) | buyer B4, seller S3 | API | Seller adds sheep to the field 1.5 s into a buy → buy 200, buyer owns a field holding the seller's animals, relist 400 "Cannot sell field with assigned animals" | known bug | artifacts/A5a-animals-added-during-buy.json |
| K2 | FAIL (known) | buyer B4, seller S3 | API | Seller's staff assignment stays on the sold field (seller lists it, buyer sees none) | known bug | artifacts/A5b-seller-assignment-after-sale.json |
| K3 | FAIL (known) | seller S2 | API | The offer U19 left `unavailable` cannot be cancelled (400 "Offer is not active") | known bug | artifacts/K-unavailable-offer-cannot-be-cancelled.json |
| R1 | PASS | buyer, seller | playwright-cli + API | Financial page after UI buys: buyer expenses "Marketplace purchase", seller incomes "Marketplace sale", running balances match the API | AC-5 | artifacts/review/R1-financial-page-buyer-and-seller.json, R1-financial-buyer.png, R1-financial-seller.png |
| R2 | PASS | buyer | playwright-cli + API | Buyer's own active offer is absent from their Browse; another user sees it | AC-4 | artifacts/review/R2-own-offer-in-browse.json, R2-own-offer-not-in-browse.png |
| R3 | PASS | logged-out | playwright-cli | Direct URL `/marketplace.html` → `/login.html`, 0 Buy Now, 0 API calls | auth | artifacts/review/R3-R6-direct-url-and-back.json, R3-logged-out-direct-url.png |
| R4a | PASS | buyer | playwright-cli + API | Two offers bought back to back: 200 + 200, balance 61.17 → 37.72 → 18.53 = API | AC-4, AC-5 | artifacts/review/R4a-two-offers-back-to-back.json |
| R4b | PASS | buyer | playwright-cli + API | Balance 30.30, buys of 20.20 and 15.15 in flight together → 200 + 400, 10.10 shown = API | AC-4 | artifacts/review/R4b-two-offers-exceed-balance.json |
| R5 | PASS | buyer, rival | playwright-cli + API | Refused buy twice: 404 + toast, nothing charged, console only the expected 404s | AC-4 | artifacts/review/R5-refusal-console-and-retry.json, console-R5-refusal.txt |
| R6 | FAIL (finding 14) | buyer | playwright-cli | Back from Financial: filter box restored, Browse unfiltered (2/2) | user expectation | artifacts/review/R6b-back-repeat.json, R6-back-from-financial.png |
| R8 | PASS | buyer | playwright-cli + API | Full buy at 375x812: modal in view after slide-in, 200, balance 3.38, field moved | AC-4, AC-5 | artifacts/review/R8-mobile-buy.json, R8b-mobile-modal-geometry-scrolled.json |
| R9 | PASS | buyer, seller | playwright-cli | After a fresh load the buyer's Create Offer lists bought fields; the seller's no longer lists sold ones | AC-5 | artifacts/review/R9-ownership-in-create-offer-dropdown.json |
| R10 | FAIL (finding 15) | buyer | playwright-cli + API | Without a reload, Create Offer misses the just-bought field | user expectation | artifacts/review/R10-create-offer-dropdown-after-buy.json |
| R11 | PASS | seller | API | HTML in displayedName refused on register and profile update (400) | security | artifacts/review/R11-seller-name-html-api.json |

## Console
- Login and post-purchase steps show 0 errors (`console-01…13`, `console-16`). The identical "0 errors" files are not cited for any PASS.
- `console-07-b3-after-refusal.txt`: "Failed to load resource: 400" on `/api/v1/marketplace/buy`. This is the expected refusal in U6, and the page showed the error toast.
- `console-14-b6-xss.txt`: two 404s for `/x`. They come from the injected `<img src=x>` (finding 1), once on the Browse card and once in the history after the reload.
- `console-15-b6-session-ended.txt`: 1 message, 0 errors, after the redirect to the login page (U20).
- Gap: the console was not saved after B5's in-page reload in U17, or after each of B5's refusals (U15–U19). Their 404 and 400 responses are recorded in each case's JSON (`buyResponses`).

## Not verified / blocked
- A4, the deleted-account token on buy. It was not re-run because deleting an account hands its id, balance and history to the next registration (`.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`, critical), which could reach a parallel run. The open evidence stands in `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md`.
- U18: the card's "Area: 42 ha" text was not captured for that case. The 42 ha comes from the seed (`artifacts/seed-summary.json`) and the edit response.
- Slow-network throttling was not applied. The buy itself takes about 4.2 s, which already shows the missing loading state (U14).

## Assumptions
- "Transaction history" in the story means the Marketplace "Transaction History" tab. Financial history is checked through the API.
- The "type filter" in the story is the field selector next to the Browse filter (All Fields / Item Type / Name / Description / Price).
- The two early attempts at the main scenario (offers 1666 and 1705) each completed a real purchase before the script stopped. The script was then re-run on fresh users (offer 1707), and every U1–U3 claim rests on that run. Both earlier purchases read back correctly: 40.17 → 16.72 and 17.43 → 40.88 (`artifacts/U0-first-attempt-state.json`, `artifacts/U0-second-attempt-partial.json`).

## Regression checks of known bugs
- `ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`: still reproduces on the Browse card, and also runs in the buyer's Transaction History after buying the field (U25).
- `ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md`: not re-run (memory rule; see Not verified).
- `ghissue-12/post-api-register--new-user-inherits-deleted-account.md`: noted, not touched. This run deleted no accounts.
- `ghissue-11/post-api-marketplace-buy--field-deleted-during-buy.md`: still reproduces through the UI buy (U21b, 1/1). When the field is deleted before the confirm, the buy is refused correctly (U19).
- `ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md`: still reproduces through the UI buy (U21a, 1/1).
- `ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md`: still reproduces, here with the edit made while the buyer's confirmation modal was open (U18).
- `ghissue-11/post-api-marketplace-buy--animals-added-during-buy.md`: still reproduces (K1, API, 1/1).
- `ghissue-11/post-api-marketplace-buy--seller-assignment-survives-sale.md`: still reproduces (K2).
- `ghissue-11/post-api-auth-token--invalid-token-403.md`: still reproduces (A3). A logged-out token also gets 403 (A2, U20).
- `ghissue-12/delete-api-marketplace-offers--unavailable-offer-stuck.md`: still reproduces (K3, the offer left by U19).
- `ghissue-13/ui-marketplace-browse--card-heading-shows-id.md`: still reproduces (U26), and the same id-only name appears in the confirmation modal and the history (finding 9).
- `ghissue-13/ui-marketplace-browse--status-dot-over-price.md`: still reproduces (U26, 3 of 3 cards).
- `ghissue-13/ui-marketplace-browse--long-description-word-overflows.md`: still reproduces in the buyer's Browse (U26: 2246 px document width in a 1366 px viewport).

## Automation
Branch `test/ui-marketplace-buyer-buys-offer` (3 commits: page object, `ui-ledger` project, test). PR: not opened yet.

| Test | Why (acceptance criterion) | Regression it catches | Poison that failed it | Stability (x/10, slow network) | Level + why | Overlaps with |
|---|---|---|---|---|---|---|
| `tests/ui/marketplace/buy-offer.spec.ts` › buyer buys an offer in Browse: the balance drops by the price, the offer leaves Browse and the purchase is in the history (`@critical @ledger`, project `ui-ledger`) | AC-4, AC-5 | wrong card bought; either balance set instead of changed by the price, or unrounded (float traps 40.17−23.45, 17.43+23.45); wrong modal; no refresh of balance, Browse or history; history entry missing or wrong; seller not credited; field not moved; offer not sold; a buy the page gives up on fails fast | 7/7 (P1 buyer remainder, P2 seller total, P6 decoy gone, P7 confirm label; partial: P3 decoy bought, P4 tab never opened, P5 wrong user) | 10/10 in `ui-ledger` (one worker, after `api` and `ui`); slow network passed (44.7 s); full `npm test` 27/27 | UI: the story is the buy flow on the real screen; AC-5 read back over the API | T1 `sale.spec.ts` (AC-5 over the API) |

The test runs alone in a new `ui-ledger` project (tag `@ledger`, workers 1, dependencies on `api` and `ui`) because the app's global ledger lock queues parallel buys past the page's 15 s request timeout (problem 5); at 4 parallel workers it failed 3/10 and 7/10. Chosen by the user; recorded as D-19 in `docs/requirements.md`.


## Lessons applied
- Before every case, a guard checks that the offer is still `active`. Results are saved after each step, so a crashed script is not re-run into a second purchase. This was added after the first two attempts each bought their offer.
- Every actor starts with a non-round balance, and the main case uses float traps (40.17−23.45, 17.43+23.45).
- A decoy offer with a near price, and two offers in one session (X cancelled, Y bought), prove that the right offer was bought.
