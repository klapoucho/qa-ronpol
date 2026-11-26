# Marketplace: buyer buys an offer (UI) — handoff to the test writer

**Run:** 2026-11-26-issue-14-marketplace-buyer-buys-an-offer · **Env:** http://localhost:3000 · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Verdict:** FAIL (four known major bugs reachable from the buyer's path). The buy itself works: modal → 200 → toast, balance updated without a reload, offer gone from Browse, Transaction History entry; AC-5 holds through the API.

## Seed recipe
- Scripts (in `{RUN_DIR}/scratch/`):
  - `lib.mjs` / `helpers.mjs`: register, fund, newField, newAnimal, `list`, `cancel`, `buy`. They come from the issue-13 run, with emails `qa.t4.*@example.test`; `register` now also returns `displayedName`.
  - `sale-state.mjs`: `saleState(sellerKey, buyerKey, offerKey)` reads every AC-5 surface through both users' own endpoints.
  - `seed.mjs`: seeds all users and offers. `seed-main2.mjs`: one fresh seller and buyer pair plus a main offer and a decoy.
  - `cookies.mjs <key>`: writes a cookie-login `run-code` file. It contains the token; delete it after use.
  - `ui.mjs`: the playwright-cli driver (`filter`, `openModal`, `act`, `actAsync`, `browseState`).
  - Case scripts: `u-main.mjs`, `u4-u5.mjs`, `u5.mjs`, `u6-u7.mjs`, `u-modal.mjs <case>`, `u-paging.mjs`, `u-b6.mjs <case>`, `u-seller.mjs`, `a-probes.mjs`, `k-unavailable.mjs`.
- Use the existing framework: `createUser`, `createField`, `createAnimal`, `fundUser` (`src/fixtures/api.fixtures.ts`), `createOffer`, `readSale`, `readMarket` (`src/fixtures/marketplace.fixtures.ts`), `loginAs` (`src/fixtures/ui.fixtures.ts`), `MarketplacePage`, `OfferCard`.
- Roles: seller and buyer, both fresh from `POST /api/v1/register`. Fund the buyer with a non-round amount whose difference from the price is a float trap. Used here: buyer 40.17 and price 23.45 → 16.72 (raw JS gives 16.720000000000002), seller 17.43 → 40.88 (raw JS gives 40.879999999999995). The backend rounds, so the UI shows "16.72 ROL".
- Order: `createUser` seller and buyer → `fundUser(buyer, 40.17)` (and the seller if seller balances are asserted) → `createField(seller)` twice → `createOffer` for both, with the target at 23.45 and the decoy at 23.54, each description carrying a unique run tag → `loginAs(buyer)` → goto `/marketplace.html` → filter by the tag → Buy Now on the target → modal Buy Now.
- Gotchas:
  - **A buy takes about 4.2 s** (the JSON DB write and a global ledger lock shared by every worker). The refresh calls start after it returns. Wait for the `POST /api/v1/marketplace/buy` response (`page.waitForResponse`), then use web-first assertions. The default 5 s expect timeout on the balance text, started at the click, is too tight; under parallel workers the buys queue up.
  - Browse loads **all** active offers at once (`GET /api/v1/marketplace/offers`, 1250+ offers including demo and other agents' offers), 9 per page. Seed the offers before `goto`, and filter by a unique tag in the description. Field names also match the filter, but an animal's "name" is its type, so filtering by type matches hundreds of offers.
  - `MarketplacePage.goto()` waits for `/fields` and `/animals`. For Browse, also wait for `GET /api/v1/marketplace/offers` and `GET /api/v1/financial/account`, because the balance shows "Loading..." until then.
  - A login replaces the user's token. Use the cookie login (`loginAs`) with the register token and never `POST /login` the same user.

## Verified locators / endpoints
| What | Locator / request | Response / state | Note |
|---|---|---|---|
| Browse filter | `page.getByPlaceholder('Filter offers by any text...')` (`#offersFilterInput`) → `fill(tag)` | re-renders `#browseOffers` at once, page 1 | **no test id**; filters client-side over the loaded list |
| Filter field | `#offersFilterField` → `selectOption('itemType' \| 'name' \| 'description' \| 'price' \| '')` | | **no test id and no label**, so it has no accessible name: use CSS |
| Browse card | `page.locator('#browseOffers .offer-card').filter({ has: page.locator('button.btn-buy[data-offer-id="<id>"]') })` → `OfferCard` | `.offer-price` "23.45 ROL", `.offer-name` "field #<itemId>", `.offer-meta` "Field: <name>, Area: <area> ha", `.offer-description` | no test id; scope by the offer id |
| Buy Now (card) | `card.root.getByRole('button', { name: 'Buy Now' })` | opens the modal | the modal's confirm button has the **same name**, "Buy Now": scope it |
| Modal | `getByTestId('confirmation-modal')` (visible: `display:flex`) | title `confirmation-modal-title` "Confirm Purchase"; message `confirmation-modal-message` `Are you sure you want to buy "field #<itemId>" for 23.45 ROL?` | the message uses the item id, not the name (finding 8): assert the price, or the item id |
| Modal confirm | `getByTestId('confirmation-modal-confirm')` (text "Buy Now") | modal hides **immediately**, then `POST /api/v1/marketplace/buy` with body `{"offerId":<number>}` → 200 `data.transaction {id, offerId, sellerId, buyerId, itemType, itemId, price, status:"completed", createdAt}`, `data.message "Purchase completed successfully"` | then GETs `financial/account`, `marketplace/offers`, `my-offers`, `transactions`, `/api/v1/statistics` |
| Modal cancel / close | `getByTestId('confirmation-modal-cancel')`, `getByTestId('confirmation-modal-close')`; a backdrop click also closes it | no request | Escape does nothing (finding 10) |
| Success toast | `page.getByRole('alert').filter({ hasText: 'Purchase completed successfully!' })` | `.notification.success` | the API message has no "!" |
| Error toast | `getByRole('alert').filter({ hasText: '<API error>' })` | "Insufficient funds to complete purchase (no overdraft allowed)" (400), "Offer not found or not available" (404) | |
| Balance | `#userBalance` (**no test id**) | text `${balance} ROL` with JS number formatting: "16.72 ROL", "31.3 ROL", "0 ROL" | updated after the buy without a reload; compare the exact string built from the rounded number |
| Transaction History tab | `page.locator('.marketplace-tabs').getByRole('button', { name: 'Transaction History' })` | `#transactionsList .transaction-item`: `.transaction-type` "Purchase: field #<itemId>" (the name only after a reload), `.transaction-date` from `toLocaleDateString()` (locale dependent, here 26/11/2026), `.transaction-amount.expense` "-23.45 ROL" | no test ids; assert `.transaction-type` and `.transaction-amount`, never the date text |
| Paging | `#offersPageSize` `selectOption('18' \| '36')`; buttons `#offersPagination .offers-page-btn[data-page="2"]` | "9 per page" has value `10` (finding 7) | |
| AC-5 read-back (API) | the `readSale` fixture | buyer 16.72, seller 40.88, field in the buyer's `/fields`, offer `sold` in the seller's my-offers, the same transaction in both `/marketplace/transactions`, buyer `{type:'expense', amount:23.45, category:'marketplace', description:'Marketplace purchase'}`, seller `{type:'income', … 'Marketplace sale'}` | `artifacts/U1-U3-main-buy.json` |

## Automation candidates
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| U1–U3 + U3a (the T4 scenario) | AC-4, AC-5 | UI + API read-back | Buyer 40.17 and two offers from one seller (target 23.45, decoy 23.54, same tag). Filter by the tag → Buy Now on the target → modal title "Confirm Purchase", message contains "23.45 ROL" → confirm → toast "Purchase completed successfully!" → `#userBalance` "16.72 ROL" without a reload → no card with the target id while the decoy card stays → Transaction History has one item, "Purchase: field #<target itemId>" and "-23.45 ROL". API (`readSale`): buyer 16.72, seller (funded 17.43) 40.88, field moved, offer `sold`, one marketplace transaction for both, one expense and one income of 23.45 | the decoy proves the right card was bought; the float-trap balances catch "set to" versus "changed by" and rounding; read every surface before the buy |
| U6 (+U7) one cent below / exact through the screen | AC-4 | UI (optional; T2 covers the API) | buyer 31.30, price 31.31 → error toast "Insufficient funds to complete purchase (no overdraft allowed)", balance "31.3 ROL", card still listed, API snapshot unchanged; then a 31.31 buyer buys the same offer → "0 ROL" | pairs with U7 |
| U12 cancel X, buy Y | AC-4 (right one picked) | UI (optional) | the only `POST /buy` body is `{"offerId": Y}`; X active, Y sold | X is offered first |
| R4b two buys exceeding the balance (review) | AC-4 no overdraft | API (`Promise.all` of two buys) — only if the issue-12 tests do not already cover it | buyer 30.30, offers 20.20 and 15.15 from one seller → statuses {200, 400 "Insufficient funds to complete purchase (no overdraft allowed)"}; exactly one offer `sold`; seller credited once | sum check guards the ledger lock |
| R1 Financial page shows the purchase (review) | AC-5 financial history | UI (optional, extends T4) | buyer `/financial.html` row "Marketplace purchase" with -23.45 (Polish locale "-23,45 ROL": assert the number or pin the locale); seller row "Marketplace sale" | observer has none |
| R2 own offer absent from Browse (review) | AC-4 (own offer) | UI (cheap add-on to T4) | after filtering by the tag, `button.btn-buy[data-offer-id=<own>]` count 0 while another user's tagged offer shows | the same offer is visible to a second user |

Lean set: U1–U3 + U3a as one test (story "Done means" is one UI test). The rest are optional.

## Do not automate
- U14, U15–U17 (no loading state, stale card and balance after a refusal): these are UX findings. Asserting today's behaviour would pin a bug; use `test.fail()` only with a bug file.
- U18, U21a, U21b, K1 (concurrent seller actions during the 4 s buy): timing-dependent and known bugs, kept as manual repros.
- U22 "9 per page" = 10 (finding 7): a bug. A paging test belongs after a fix.
- U25 field-name HTML: a security finding. A test for it belongs after a fix; keep seed names plain.
- U11 Escape / focus: an accessibility finding.
- Review N1 (Back ignores the filter), N2 (bought field missing from Create Offer until reload), N3 (money format): open bugs in `.qa/bugs/ghissue-14/`.

## Open findings
- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`: also runs in the buyer's history after the purchase. Keep field names plain text.
- `.qa/bugs/ghissue-11/delete-api-marketplace-offers--cancel-during-buy-still-sold.md`, `post-api-marketplace-buy--field-deleted-during-buy.md`, `put-api-marketplace-offers--item-edited-after-listing.md`: never touch the seller's item during the test's buy.
- New, not yet filed: no loading state and double attempt; stale Browse and balance after a refusal; "9 per page" = 10; header counters stale; modal Escape/focus; back to page 1 after a buy; silent redirect on an ended session; the confirmation and history use `field #id`; balance decimals. The T4 test must not assert the item name in the modal or in the pre-reload history, or the header counters.

## Traps
- Wait for the buy response (about 4.2 s, longer under parallel workers because of the global ledger lock) before asserting the balance; the refresh GETs follow it.
- The modal's confirm button and the card's button are both named "Buy Now": click the modal one by test id.
- History date is `toLocaleDateString()`: never assert it.
- Browse holds 1250+ offers from demo users and other agents: scope by the offer id after filtering by your tag; never count the list.
- `seed-state.json` tokens: after the U20 logout B6 has a new login token; the register token is dead.
- `#offersFilterField` has no label, so `getByLabel` cannot find it.
