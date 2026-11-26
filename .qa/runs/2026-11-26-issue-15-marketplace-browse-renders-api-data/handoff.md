# Marketplace: browse renders API data (UI on mocks) — handoff to the test writer

**Run:** 2026-11-26-issue-15-marketplace-browse-renders-api-data · **Env:** http://localhost:3000 · **App version:** Rolnopol 1.126.0 (Docker) · **Verdict:** FAIL. A failed offers load (5xx, 400/404/429, network failure, timeout) leaves "Loading offers..." forever with only a 6 s toast. The known field-name XSS still reproduces. Pages, filter and the empty state work, except "9 per page" re-selected, which shows 10.

## How Browse works (proved, live + mocked)
- **One call:** `GET /api/v1/marketplace/offers`, no query string, header `token: <cookie rolnopolToken>`. Fired on page load and on every click on the Browse Offers tab, plus after create/buy/cancel. Query params are ignored by the server (A1).
- **Server side:** only `status: "active"` offers of **other** users (AC-3), ordered by id ascending.
- **Browser side:** type filter, free-text filter, page size (9/18/36) and pagination are computed in the browser from the full list. A mock therefore answers **the whole list once**, and the page slices it.
- **Response (live, A1):**
  ```json
  { "success": true, "timestamp": "…", "data": { "total": 1386, "offers": [
    { "id": 1952, "sellerId": 6215, "itemType": "field", "itemId": 2094, "price": 4.37,
      "description": "Sloneczne pole przy lesie", "status": "active",
      "createdAt": "2026-11-26T20:59:23.568Z", "updatedAt": "2026-11-26T20:59:23.568Z",
      "details": { "name": "QA t5 sellerA 6215", "area": 3.5 }, "sellerLabel": "qa_seller_c87842a7" },
    { "id": 1954, "itemType": "animal", "itemId": 1489, "price": 7.01, "details": { "type": "sheep", "amount": 4 }, "…": "…" } ] } }
  ```
  `ok(offerListSchema-shaped data)` from `src/mocks/replies.ts` produces this envelope. `offerSchema` does not model `details` and `sellerLabel`, but the card needs both. Extend the schema or build the payload type locally.
- **What the page reads from the response:** only `data.offers` (`total` is ignored). On HTTP 200 a body without `data` throws, and the page shows "Failed to load offers" (M8i). `data` without `offers`, or `offers: null`, shows "No offers available" (M8k, M8l).

## Seed recipe
- Scripts (all in `{RUN_DIR}/scratch/`):
  - `seed.mjs`: viewer V (13.57 ROL) with one field listed (3.33), seller S (21.09 ROL) with 2 fields (4.37, 12.5) and one animal group (sheep ×4, 7.01) listed. Writes `seed-state.json`. Helpers in `lib.mjs` / `helpers.mjs` (emails `qa.t5.*@example.test`).
  - `probe-api.mjs`: A1–A3 (contract, visibility, cancel). `probe-pageload.mjs`: live shapes of all page-load calls (A4).
  - `case-template.js` + `mkcase.mjs` + `runcase.sh '<case json>'`: logs the browser in through cookies, mocks only `GET /api/v1/marketplace/offers` (count, array, status, raw body, abort, delay, hang, a second answer for retries), runs steps (filter, field, size, page, next/prev, tab, reload, screenshot) and dumps the Browse state as JSON. Each case's JSON is in `cases/*.js` → `artifacts/<name>.json`.
  - `guard501.js`: shows what happens when page-load calls are left unmocked. `offline.js`: live offline check. `geom.js`: grid, status dot and empty-state geometry. `mk-m9.mjs`: odd-value offers.
- **The ui-mocked test needs no seed.** Use `mockApi` + `mockSession` (`src/fixtures/mock.fixtures.ts`, project `ui-mocked`, `networkGuard: true`). The shared handlers already answer `authorization`, `feature-flags` and `/api/version`.
- **Handlers the Marketplace page needs on top (M10).** Every unmocked one gets the guard's 501, which shows an error toast and fails the test through `unhandled`:

  | Call | Minimal body (`ok(...)` = envelope) | Why |
  |---|---|---|
  | `GET /api/v1/financial/account` | `ok({ account: { id, userId, balance: 13.57, currency: 'ROL', … } })` | balance line |
  | `GET /api/v1/fields` | `ok([])` | the card heading looks up the viewer's own fields by `itemId` (see Traps) |
  | `GET /api/v1/animals` | `ok([])` | same, for animals |
  | `GET /api/v1/marketplace/offers` | the case under test | Browse |
  | `GET /api/v1/marketplace/my-offers` | `ok({ offers: [], total: 0 })` | My Offers tab |
  | `GET /api/v1/marketplace/transactions` | `ok({ transactions: [], total: 0 })` | history tab |
  | `GET /api/v1/financial/stats` | `ok({ statistics: { currentBalance, totalIncome, totalExpenses, … } })` | header |
  | `GET /api/v1/financial/marketplace-stats` | `ok({ totalActiveOffers, totalOffers, totalTransactions, totalVolume })` | header "ACTIVE"/"TRADES". It does **not** come from the offers list |
  | `GET /api/v1/statistics` | **bare** `{ totalValue: 0, … }` (no envelope, plain `fetch`) | "TOTAL VALUE". A 501 here gives no toast, only 0 |
  | `GET /api/v1/authorization` | already shared | called twice |

  Live bodies: `artifacts/A4-page-load-response-shapes.json`.

## Verified locators / endpoints
| What | Locator / request | Response / state | Note |
|---|---|---|---|
| Page | `page.goto('/marketplace.html')`, Browse is the default tab | URL stays `/marketplace.html` for every tab | `MarketplacePage.goto()` waits for fields/animals; for Browse also wait for the offers response |
| Browse list | `page.locator('#browseOffers')` | children: `.loading` (spinner, "Loading offers..."), `.offer-card` × n, or `.empty-state` | **no test id, no role** on the list or cards; the page's only test ids are nav and the confirmation modal (`artifacts/testids-marketplace-browse.json`) |
| Card | `new OfferCard(page.locator('#browseOffers .offer-card').filter({ has: page.locator('button[data-offer-id="<id>"]') }))` | `type` "Field"/"Animal"; `price` "`<price as sent>` ROL" (`7` → "7 ROL", `12.5` → "12.5 ROL"); `name` "field #`<itemId>`" (known bug K1); seller `.offer-seller` "Offered by: `<sellerLabel>`" ("Unknown" when missing); `details` "Field: `<name>`, Area: `<area>` ha" / "Type: `<type>`, Amount: `<amount>`"; `description` (element absent when empty); button "Buy Now" `.btn-buy`, enabled for active | `OfferCard` has no seller field yet: `root.locator('.offer-seller')` |
| Loading | `#browseOffers .loading` text "Loading offers..." | visible until the offers response is handled | the slow (3 s) mock shows it, then cards (M8n) |
| Empty state | `#browseOffers .empty-state` → text **"No offers available"**, icon `i.fas.fa-store` | pagination still rendered: page-size select, "« Prev" (disabled), "1" (active, enabled), "Next »" (disabled) | the same text for a filter with no match (problem 5) |
| Error state (only for a 200 without `data`) | `#browseOffers .empty-state` → **"Failed to load offers"**, icon `i.fas.fa-exclamation-triangle` | no pagination rendered, no toast | not reached by a 500 today (problem 1) |
| Error toast | `page.getByRole('alert').filter({ hasText: '<API error text>' })` | `.notification.error`, title "Error", text = the response's `error` field verbatim; 6 s; 5xx gives **two** identical toasts | network: "Failed to fetch"; timeout: "signal timed out"; non-JSON body: "Invalid JSON response" |
| Filter text | `page.getByPlaceholder('Filter offers by any text...')` | filters on every `input`, resets to page 1 | no label, no test id |
| Filter field | `page.locator('#offersFilterField')` → `selectOption('itemType' \| 'name' \| 'description' \| 'price' \| '')` | applies only when the text is non-empty; changing it resets to page 1 | no label, no test id (an unnamed combobox) |
| Page size | `page.locator('#offersPageSize')` → `selectOption({ label: '18 per page' })` | option values `10`/`18`/`36` for labels "9/18/36 per page" | select by **label**; value `10` is the bug (problem 2); no label, no test id; re-rendered on every page change (locate it fresh) |
| Pagination | `page.locator('#offersPagination').getByRole('button', { name: 'Next »' })`, `'« Prev'`, `{ name: '3', exact: true }` | active page button has class `active`; Prev disabled on page 1, Next disabled on the last page; at most 5 numbers, window centred on the current page (page 5 of 12 → 3..7) | no test ids; `[data-page]` attribute exists (`prev`/`next`/n) |
| Tabs | `page.locator('.tab-button[data-tab="browse"]')` (also `my-offers`, `create`, `transactions`) | clicking Browse refetches offers and resets to page 1 (`M4b-mock-browse-tab-on-page-2.json`), keeps the filter (`M5`) | the existing page object uses `.marketplace-tabs` + role/name |
| Header counters | `#totalOffers`, `#myOffersCount`, `#totalTransactions`, `#totalValue` | from marketplace-stats, my-offers and statistics, set after **all** page-load calls finish | not from the offers list; "ACTIVE" stays 0 while offers hang |

## Automation candidates
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| M1 one page of offers | AC-8 (cards) | ui-mocked | 3 offers (field 12.34 "Mock Meadow" 2.75 ha by "Mock Seller A"; animal 7 cow ×5 by "Mock Seller B"; a third distinct one) → exactly 3 cards; per card (scoped by `data-offer-id`) type, "12.34 ROL", "Offered by: Mock Seller A", "Field: Mock Meadow, Area: 2.75 ha", description; Prev and Next disabled, only page "1" | values differ per card, so a card showing another offer's data fails; card count = 3 |
| M2 several pages | AC-8 (pagination) | ui-mocked | 10 offers → page 1 has 9 cards (ids 1–9), "2" button; Next → page 2 has 1 card (id 10), Next disabled. Optionally 19 offers at "18 per page" → page 2 = 1 card | 9 offers → 1 page, no "2" (M2a): the boundary that proves pagination is computed, not fixed |
| M6 no offers | AC-8 (empty) | ui-mocked | `offers: []` → `#browseOffers .empty-state` "No offers available", no `.offer-card`, Next disabled | M1 on the same page shows cards |
| M7 500 error | AC-8 (error) | ui-mocked | expected by AC-8: a lasting readable error in the list. Today: toast "Failed to get marketplace offers" (assertable) and the list stuck on "Loading offers...". Assert the toast, then mark the in-list error as `test.fail()` linked to problem 1's bug file, or keep the 500 case to the toast only and record the gap | the toast text comes from the mocked `error`, so a different message proves the page shows the API's text |
| M5 type filter (optional) | AC-8 (filter by type) | ui-mocked | 18 offers (6 animals); field "Item Type", text "animal" → exactly the 6 animal ids; text "field" → the 12 fields over 2 pages | the other type's cards are absent |
| A2 visibility (optional, not a mock) | AC-3 | API | V's `GET /marketplace/offers` contains S's offer ids and no offer with `sellerId === V.id`; S's lacks its own | V's own offer id 1951 absent from V's list (`A2-visibility-api.json`) |

Lean set for this story: one parametrized ui-mocked spec with the four rows the issue names (page, several pages, none, 500). M2 should use 10 offers, the first count that needs a second page. AC-3 is server-side, so a mock cannot prove it. Leave it to the API spec if one covers it.

## Do not automate
- M3 "9 per page" re-selected shows 10. This is a bug; asserting the current behaviour would pin it. Add it after a fix, or as `test.fail()` with the bug file.
- M8 other failure kinds (4xx, abort, timeout, malformed JSON). These are findings or edge facts. The 15 s timeout is slow by nature.
- M9 odd values (unknown status, unknown itemType, `details: {}` renders "Field: undefined"). The real API never sends them, so a test would pin frontend accidents.
- K1–K4 known bugs. Visual or security; they belong in tests after a fix.
- V1/V2 geometry. Visual.

## Open findings
- Problem 1 (major, new): a failed load keeps the spinner forever. The M7 row must not assert "Failed to load offers" for a 500. Today that text appears only for a 200 without `data`.
- Problem 2 (minor, new): the "9 per page" option value is 10. Never select "9 per page" after another size in a passing test.
- Problem 4 (cosmetic, new): two toasts per 5xx. Don't assert a toast count; use `.first()` or `toHaveCount` only knowingly.
- `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md`: the heading is "field #`<itemId>`". Assert the name through the details line (`details`), not the heading, or assert the heading as `field #<itemId>` knowing it is the bug.
- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`: keep mock names plain text.

## Traps
- **The heading reads the viewer's own fields/animals.** The heading is `fields.find(f => f.id == offer.itemId)?.name`, otherwise `<itemType> #<itemId>`. A mocked `GET /fields` with an id equal to an offer's `itemId` changes that card's heading to the field's name. Keep `fields`/`animals` empty, or ids disjoint from offer `itemId`s.
- **Order of handlers vs `goto`:** the offers call fires during load. Register the handler before `goto`. A retry happens only on a Browse tab click or a reload (no retry button).
- **Wait for the right state, not a time:** wait for `#browseOffers .offer-card` / `.empty-state` / the toast. The spinner is in the DOM until the response is handled.
- **The pagination bar (page-size select and buttons) is rebuilt** with `innerHTML` on every render. Use locators, which re-resolve, never element handles kept across a page change.
- **Filter field without text does nothing.** Selecting "Item Type" alone does not filter; the text box must be non-empty.
- **401/403 on the offers call logs the user out** (cookies cleared, redirect to `/login.html`). A test mocking 401 ends on the login page.
- **Unknown values:** an `itemType` other than "field" gets the "Animal" badge. Don't use exotic types in mock data.
- **Numbers:** the price is printed as the JSON number's `String()` (`12.50` sent as number → "12.5 ROL"). Pick prices whose text is unambiguous (12.34).
- **Live list is big** (1386+ active offers incl. demo data): never assert live counts or page 1 contents.

## Reviewer additions (automation candidates)
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| R4 field area must be a number | user expectation (security) | API | `POST /fields { name, area: "2<img src=x onerror=…>" }` and `PUT /fields/{id}` with the same → expect 400 (today 201/200: `test.fail()` linked to the area-XSS bug file) | area 1.25 accepted (control); HTML description refused with 400 (R1) |
| R4 card shows offer text as plain text | user expectation (security) | ui-mocked | mocked offer with `details.area: '2<img src=x onerror="document.title=\'XSS\'">'` → `document.title` unchanged, card text contains the literal `<img` (today it runs: `test.fail()`) | a card with plain values renders and the title stays "Marketplace - Rolnopol" |
| R6 late answer discarded | user expectation | ui-mocked | offers handler: answer #2 delayed 3 s (2 offers), answer #3 immediate (3 offers); click the Browse tab twice → after 4 s still the 3 fresh cards (today stale: `test.fail()` or skip until fixed) | the fresh list renders first (snap at 0.8 s) |

These are outside the story's named scenario (page, several pages, none, 500): candidates for later, not for this story's lean spec.
