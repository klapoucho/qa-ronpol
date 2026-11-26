# Marketplace: browse renders API data (UI on mocks) — FAIL

**Reviewer:** GAPS CLOSED — coverage and evidence hold; one gap (other open text on the card) closed with a new major XSS through the field area (R4). See `review.md`.

**Source:** https://github.com/klapoucho/qa-ronpol/issues/15 (no linked PR) · **Run:** 2026-11-26-issue-15-marketplace-browse-renders-api-data · **Env:** http://localhost:3000/marketplace.html · **Platforms:** Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; API (Node fetch) · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Date:** 2026-11-26
**Roles tested:** registered user as viewer (V, 13.57 ROL) and as seller (S, 21.09 ROL); logged-out visitor · **Skipped:** deleted-account token — Browse moves no money or items, and checking it would need a deletion (id reuse)

**Evidence source.** Each case says whether it ran on the live app or on a mocked `GET /api/v1/marketplace/offers` (Playwright `page.route` in the CLI; every other call stayed live). AC-3 visibility and the page-size bug were checked live. The empty state, errors and pagination edges were checked on mocks, because the live list holds 1386+ offers and a real server error cannot be caused safely.

**What Browse does (established).** One call, `GET /api/v1/marketplace/offers`, with no query parameters (params sent by hand are ignored, A1). The server returns every active offer of other users, oldest first (`{ success, timestamp, data: { offers[], total } }`). The type filter, the free-text filter, 9/18/36 per page and pagination all run in the browser. Empty: "No offers available". A failed load mostly leaves "Loading offers..." on screen (problem 1).

## Problems (user-facing)

### 1. When loading the offers fails, Browse keeps showing "Loading offers..." forever. The error is only a toast that disappears after 6 s — major
- **Steps:** 1. Log in, open Marketplace (Browse Offers). 2. `GET /api/v1/marketplace/offers` fails: HTTP 500, 502, 400, 404, 429 (the app's own rate-limit body), a network failure, or no answer within 15 s (mocked responses).
- **Expected (AC-8):** a readable error in the list that stays on screen, the page still usable, and a way to retry.
- **Actual:**
  - The list area keeps the spinner and "Loading offers..." for good (checked at 7 s, 16 s and 23 s). Pagination and the page-size selector are not rendered.
  - The only error is a red toast with the API's `error` text, for example "Failed to get marketplace offers" or "Too many requests from this IP, please try again later.". It disappears after 6 s.
  - Typing in the filter afterwards replaces the spinner with **"No offers available"**, which tells the user the marketplace is empty when it failed to load.
  - The page has its own error state ("Failed to load offers" with a warning icon), but it appears only for an HTTP 200 whose body has no `data`, for example malformed JSON (M8i/M8j/M8m).
  - Retry works only through clicking the Browse Offers tab again or reloading the page (M7c, M7d). Nothing on the page offers it.
  - 401/403 send the user to `/login.html`, which is fine.
- **Who reaches it:** any user whose offers request fails. The 429 needs no crafted input: the browser does not send the synthetic token, the limit is 100 API requests per 30 s per IP, and one Marketplace load makes 13 API calls, 11 of which count against the limit (reviewer R5): about 9 loads per 30 s per IP. A few quick reloads, or colleagues behind the same IP, are enough. The 429 was not triggered live, because it would throttle the shared environment; the mock uses the app's own 429 body from `api/limiters.js`.
- **Evidence:**
  - 500: `artifacts/M7a-mock-500.json` + `artifacts/M7a-mock-500-after-toast-gone.png` (toast gone, spinner still there, then the filter shows "No offers available").
  - Other failures, per-case JSON: `M8a-mock-502-html.json`, `M8b-mock-400.json`, `M8c-mock-404.json`, `M8d-mock-429.json`, `M8g-mock-abort-failed.json` + `M8g-mock-network-abort.png`, `M8h-mock-abort-connrefused.json`.
  - Timeout: `M8p-mock-hang-no-input.json` (spinner at 23 s) and `M8o-mock-hang-timeout.json` (typing a filter during the load shows "No offers available").
  - The only path to the page's own error state: `M8i-mock-malformed-json-200.json` + `M8i-mock-malformed-json.png`.
- **Hint (optional):** in `api-service.js` the `throw` for 5xx sits inside the same `try` whose `catch` swallows it, and 4xx, network failures and timeouts return `{ success: false }`. `_loadOffers` ignores that value, so its "Failed to load offers" branch never runs.

### 2. A field's area containing HTML runs as script in every viewer's browser on the Browse card — major (security, found by the reviewer)
- **Steps:**
  1. Seller (fresh user): `POST /api/v1/fields { "name": "QA rv15 6216 pole", "area": 1.25 }`.
  2. `PUT /api/v1/fields/{id} { "area": "2<img src=x onerror=\"document.title='QA-RV15-XSS-AREA'\">" }` → 200. `POST /fields` with that area → 201 too; an array area is also stored.
  3. List it: `POST /api/v1/marketplace/offers { itemType: "field", itemId: <id>, price: 2.34, description: "Pole testowe recenzenta" }` → 200.
  4. Another user opens Marketplace → Browse Offers and reaches the card.
- **Expected:** the area is refused unless it is a number (the field form takes a number), or the card shows it as plain text.
- **Actual:** `GET /marketplace/offers` serves `details.area` as the HTML string. The card inserts it as HTML: a broken image after "Area: 2", and its `onerror` runs in the viewer's session (page title "QA-RV15-XSS-AREA").
- **Who reaches it:** the attacker needs crafted API input; the victim only views the card. The known field-name bug says the name is the only open text on the card; this disproves it, and validating field names alone would leave this hole open.
- **Evidence:** `artifacts/review/R1c-api-field-area-shapes.json`, `artifacts/review/R4-api-area-html-offer-listed.json`, `artifacts/review/R4-live-area-html-runs-in-viewer-browse.json`, `artifacts/review/R4-live-area-html-runs-in-viewer-browse.png`, `artifacts/review/console-R4-live-area-html-runs-in-viewer-browse.txt`. Offer cancelled and areas restored afterwards (`artifacts/review/R4-cleanup.json`).
- **Env:** live, viewer V, seller a fresh account (id 6216).

### 3. "9 per page" shows 10 offers once the user has changed the page size — minor
- **Known bug:** already filed as `.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md` (the run started from an out-of-date `main`, so the known-bug grep missed it). Still reproduces.
- **Steps:** 1. Browse Offers. 2. Pick "18 per page" (or 36). 3. Pick "9 per page" again.
- **Expected:** 9 cards per page.
- **Actual:** 10 cards per page, and the page count follows 10: 30 offers give 3 pages, where 9 per page means 4. The option "9 per page" has the value `10`. At first load it shows 9, because the code starts at 9 without reading the option.
- **Evidence:** live `artifacts/M3-live-page-size-9-shows-10.json` (back-to-9-per-page: 10 cards). Mocked `artifacts/M3-mock-page-size-9-shows-10.json` + `artifacts/M3-mock-9-per-page-shows-10-cards.png` (page 3 of 3 with 10 cards, "9 per page" selected).

### 4. Error toasts show raw technical text for network problems — minor
- **Steps:** Browse Offers while the offers request fails at network level.
- **Expected:** a message the user understands.
- **Actual:** a network failure gives "Failed to fetch" (live offline and mocked abort). A timeout gives "signal timed out" (after about 15 s). A 502 with an HTML body gives "Invalid JSON response".
- **Evidence:** `artifacts/M8q-live-offline-browse-tab.json` (live app, browser offline), `artifacts/M8g-mock-network-abort.png`, `artifacts/M8p-mock-hang-no-input.json`, `artifacts/M8a-mock-502-html.json`.

### 5. A late answer from an earlier offers request replaces the newer list — minor (found by the reviewer)
- **Steps (mocked timing):** 1. Browse Offers loaded. 2. Click the Browse Offers tab, then again 0.3 s later. 3. The first request answers after 3 s, the second at once.
- **Expected:** the list from the latest request stays.
- **Actual:** the newest list (3 offers) shows, then at 3.2 s the older answer (2 offers) replaces it. The user may see an offer that is gone, and Buy Now on it fails.
- **Who reaches it:** two Browse loads in flight (double click on the tab, or a tab click during the refetch after a buy/create/cancel) and a change in between. Timing-dependent, so minor.
- **Evidence:** `artifacts/review/R6-stale-answer-overwrites-fresh.json` (request 2 answered at 482 ms, request 1 at 3160 ms), `artifacts/review/R6-stale-answer-overwrites-fresh.png`.

### 6. The "filter by" and "per page" selects on Browse have no accessible name — minor (found by the reviewer)
- **Steps:** Browse Offers, read the accessibility tree (or use a screen reader).
- **Expected:** each control is announced with its purpose ("Filter field", "Offers per page").
- **Actual:** both selects are a bare "combobox" (no `<label>`, `aria-label` or title). The filter text box is named only by its placeholder.
- **Evidence:** `artifacts/review/R8-live-browse-a11y-snapshot.yml` (lines 62, 63, 161).

### 7. One failed load shows the same error toast twice (5xx) — cosmetic
- **Steps:** Browse Offers with the offers request answering 500 (or 502).
- **Actual:** two identical "Error / Failed to get marketplace offers" toasts stacked. 4xx responses show one.
- **Evidence:** `artifacts/M7b-mock-500-two-toasts.png`, `artifacts/M7b-mock-500-toasts.json` (`maxToastsAtOnce: 2`), `artifacts/M8b-mock-400.json` (`maxToastsAtOnce: 1`).

### 8. A filter with no match says "No offers available", the same as an empty marketplace — cosmetic
- **Steps:** Browse Offers with offers present, then type a text nothing matches.
- **Expected:** a "no offers match your filter" message.
- **Actual:** "No offers available" with the store icon, word for word the empty-marketplace state.
- **Evidence:** `artifacts/M5-filter-no-match.png`, `artifacts/M5-mock-filter-item-type.json` (no-match), live `artifacts/L1-live-browse.json` (filter-own-field-name).

### 9. The empty and error states sit in the first card column, not in the middle of the list — cosmetic
- **Steps:** Browse Offers with no offers (or a filter with no match, or the error state).
- **Actual:** the message box is one grid column wide (373 px at left 103). The text is centred at x=290, while the 1160 px list is centred at x=683. Transaction History's empty state on the same page is centred (683 vs 683).
- **Evidence:** `artifacts/M6-mock-empty.png`, `artifacts/V2-mock-empty-state-geometry.json`, `artifacts/V2-live-transactions-empty-state-geometry.txt` + `artifacts/V2-live-transactions-empty-state.png` (1366x768).

## Test cases
| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| A1 | PASS | V | API | Contract `{success,timestamp,data:{offers,total}}`; offer keys `id,sellerId,itemType,itemId,price,description,status,createdAt,updatedAt,details,sellerLabel`; only `active`; id ascending; `page/limit/itemType/search/status` ignored (same ids) | AC-8 (mock input) | artifacts/A1-browse-api-contract.json |
| A2 | PASS | V, S | API | V's Browse has S's 3 offers, none of V's own; S's Browse lacks S's own and has V's; My Offers = own | AC-3 | artifacts/A2-visibility-api.json |
| A3 | PASS | S, V | API | Cancelled offer leaves V's Browse, stays in S's My Offers as `cancelled`; others stay | AC-3 | artifacts/A3-cancelled-offer-leaves-browse.json |
| A4 | PASS | V | API | Live shapes of all page-load calls | assumption (writer input) | artifacts/A4-page-load-response-shapes.json |
| L1 | PASS | V | playwright-cli, live | 9 cards, one offers call without params; S's card "Field", "4.37 ROL", seller, "Field: QA t5 sellerA …, Area: 3.5 ha", description, enabled Buy Now; V's own field name filters to nothing | AC-3, AC-8 | artifacts/L1-live-browse.json, artifacts/V1-live-browse-page1.png |
| L2 | PASS | V | live | My Offers shows V's offer 1951, not S's | AC-3 | artifacts/L1-live-browse.json |
| M1 | PASS | V | mock | 3 offers → 3 cards with badge, price as sent ("12.34 ROL", "7 ROL", "0.5 ROL"), seller / "Unknown", details; 1 page, Prev/Next disabled | AC-8 | artifacts/M1-mock-one-page.json, artifacts/M1-mock-one-page.png |
| M2 | PASS | V | mock | 9 → 1 page; 10 → 2 pages (page 2 = 1 card); 18 → 2; 19 at 18/page → page 2 = 1; 36 at 36/page → 1; 37 → page 2 = 1; 100 → 12 pages, 5-number window centred on the current page, page 12 = 1 card, Next disabled | AC-8 | artifacts/M2a…M2h-*.json |
| M3 | FAIL | V | live + mock | "9 per page" re-selected shows 10 | AC-8 | artifacts/M3-live-page-size-9-shows-10.json, artifacts/M3-mock-page-size-9-shows-10.json, artifacts/M3-mock-9-per-page-shows-10-cards.png |
| M4 | PASS | V | mock | On page 12, size 18 → page 1. On page 4, filter → page 1 with the matching 6. Clear → 6 pages. On page 3, field change → page 1. On page 2, Browse tab click → refetch + page 1 | AC-8 | artifacts/M2h-mock-100-last-page.json, artifacts/M4b-mock-browse-tab-on-page-2.json |
| M5 | PASS | V | mock | "Item Type" + "animal" → the 6 animals (case-insensitive); "field" → 12 fields; "All Fields" + "cow" → 6; whitespace = no filter; filter kept across tabs | AC-8 | artifacts/M5-mock-filter-item-type.json |
| M6 | PASS | V | mock | `offers: []` → "No offers available" + fa-store icon; pagination "1", Prev/Next disabled; filter, size, page, tabs still work, no errors | AC-8 | artifacts/M6-mock-empty.json, artifacts/M6-mock-empty.png |
| M7 | FAIL | V | mock | 500 → endless spinner + 2 toasts for 6 s; filter then "No offers available"; tab click / reload recovers | AC-8 | artifacts/M7a-mock-500.json, artifacts/M7a-mock-500-after-toast-gone.png, artifacts/M7b-mock-500-toasts.json, artifacts/M7c-mock-500-then-retry.json, artifacts/M7d-mock-500-reload.json |
| M8a–d | FAIL | V | mock | 502 HTML / 400 / 404 / 429 → endless spinner + toast | AC-8 | artifacts/M8a…M8d-*.json |
| M8e–f | PASS | V | mock | 401/403 → cookies cleared, /login.html | user expectation | artifacts/M8e-mock-401.json, artifacts/M8f-mock-403.json |
| M8g–h | FAIL | V | mock | Abort failed / connection refused → endless spinner + "Failed to fetch" | AC-8 | artifacts/M8g-mock-abort-failed.json, artifacts/M8g-mock-network-abort.png, artifacts/M8h-mock-abort-connrefused.json |
| M8i–m | PASS (state) | V | mock | 200 malformed / `{}` / `success:false` without data → "Failed to load offers" + warning icon, no toast, no pagination. No `offers`, or `offers: null` → "No offers available" | AC-8 | artifacts/M8i…M8m-*.json, artifacts/M8i-mock-malformed-json.png |
| M8n | PASS | V | mock | 3 s delay → "Loading offers..." then 4 cards | user expectation | artifacts/M8n-mock-slow-3s.json |
| M8o–p | FAIL | V | mock | No answer → spinner, toast "signal timed out" ~15 s, spinner at 23 s; header ACTIVE 0 until then | AC-8 | artifacts/M8p-mock-hang-no-input.json, artifacts/M8o-mock-hang-timeout.json |
| M8q | PASS (problem 4) | V | live offline | Offline, Browse tab → old cards stay, "Failed to fetch"; back online → fine | user expectation | artifacts/M8q-live-offline-browse-tab.json |
| M9 | INFO | V | mock | sold/cancelled/unavailable → suffix + message + disabled Buy Now; unknown status → active look; unknown itemType → "Animal" badge, no details; `details:{}` → "Field: undefined"; `sellerDisplayedName` fallback | writer input | artifacts/M9-mock-odd-offers.json, artifacts/M9-mock-odd-offers.png, artifacts/M1-mock-one-page.json |
| M10 | INFO | V | mock | Page-load calls at 501 → 7 error toasts, balance "Loading...", My Offers/Transactions stuck | writer input | artifacts/M10-mock-unhandled-calls-501.json |
| V1 | PASS | V | live | 3 × 373 px columns, gap 20, flush with the 1160 px list; pagination centred (288/290) | user expectation | artifacts/V1-R3-live-grid-geometry.json, artifacts/V1-live-pagination-centering.txt, artifacts/V1-live-browse-page1.png |
| V2 | FAIL | V | mock + live | Empty state off-centre (problem 9) | user expectation | artifacts/V2-mock-empty-state-geometry.json, artifacts/V2-live-transactions-empty-state-geometry.txt |
| X1 | PASS | visitor | live + API | No cookies → /login.html without an offers call; API no token 401 "Access token required", bad token 403 "Invalid or expired token" | user expectation | artifacts/X1-live-logged-out-redirect.json, artifacts/X1-api-no-token.json, artifacts/X1-api-bad-token.txt |
| K1 | FAIL (known) | V | live + mock | Heading "field #2094" while the item is "QA t5 sellerA 6215" | regression | artifacts/L1-live-browse.json, artifacts/M1-mock-one-page.png |
| K2 | FAIL (known) | V | mock | 300-letter word → document 3020 px in a 1366 px viewport | regression | artifacts/M9-mock-odd-offers.json |
| K3 | FAIL (known) | V | live | Status dot overlaps price text on 9/9 cards (dot left 448 < price right 454) | regression | artifacts/V1-R3-live-grid-geometry.json |
| K4 | FAIL (known) | V | mock + API | `details.name` with `<img onerror>` ran: title "QA-XSS-MOCK"; API still stores HTML field names (201) | regression | artifacts/M9-mock-odd-offers.json, artifacts/R4-live-html-field-name-accepted.json |

| R1 | PASS | seller (fresh) | API | Description as array / nested array / object / entities → 400, whitelist holds | regression (field-name bug claim) | artifacts/review/R1b-api-description-shapes.json |
| R2 | PASS | seller (fresh) | API | Displayed name with HTML refused at register and profile update | regression | artifacts/review/R1-R3-api-open-text.json |
| R3 | PASS | seller (fresh) | API | Animal type with HTML or as array refused | regression | artifacts/review/R1-R3-api-open-text.json |
| R4 | FAIL | seller (fresh), V | API + live | Field area with HTML stored and runs on V's Browse card (problem 2) | user expectation (security) | artifacts/review/R4-live-area-html-runs-in-viewer-browse.json, artifacts/review/R4-live-area-html-runs-in-viewer-browse.png |
| R5 | PASS | V | live | Browser load: 13 API calls, 11 count against the per-IP limit, no synthetic token | AC-8 (problem 1 severity) | artifacts/review/R5-browser-load-rate-limit-headers.json |
| R6 | FAIL | V | mock | Late answer of an earlier request replaces the newer list (problem 5) | user expectation | artifacts/review/R6-stale-answer-overwrites-fresh.json, artifacts/review/R6-stale-answer-overwrites-fresh.png |
| R7 | INFO | V | mock | "Price" filter is a substring text match ("2" matches 2.25 and 12.25), consistent with the placeholder | user expectation | artifacts/review/R7-mock-price-filter-substring.json |
| R8 | FAIL | V | live | Filter-field and per-page selects have no accessible name (problem 6) | user expectation (a11y) | artifacts/review/R8-live-browse-a11y-snapshot.yml |

## Console
- No errors on the live Browse, My Offers and Transactions loads (console-L1-live-browse.txt, console-V1-live-browse-page1.txt, console-V2-transactions-tab.txt).
- `Failed to load resource … 500/502/400/404/429/501`, `ERR_FAILED`, `ERR_CONNECTION_REFUSED`, `ERR_INTERNET_DISCONNECTED`: the browser logging the responses each mock (or offline mode) caused on purpose. Explained.
- `Error loading offers: TypeError: Cannot read properties of undefined (reading 'offers')` (M8i/j/m): the page's own log when a 200 body has no `data`. Explained.
- M9 404 for `/x`: the K4 XSS payload's `<img src=x>`. Explained.
- M8e/M8f console files are empty, because the redirect to the login page reset the log. The case JSON holds the mocked 401/403, plus the login page's own 401/403 after the cookies were cleared. Explained.

## Not verified / blocked
- A real 429 from the live server. It would throttle the shared IP for parallel runs. Mocked with the server's own body.
- A real server 500. It cannot be caused without changing the app. Mocked.
- Mobile viewport: out of the story's scope. A known bug covers the tab bar.
- Deleted-account token: not applicable, and it would need a deletion.

## Assumptions
- "Filters by item type" is the "Item Type" choice in the filter-field select plus the type typed into the text box. The page has no dedicated type dropdown.
- "A readable error … without breaking the page" means an error that stays visible in place of the list. A 6 s toast over an endless spinner does not meet it.
- The offers shape for mocks comes from the live API (A1), not from OpenAPI.

## Regression checks of known bugs
- `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md` — still reproduces (live L1, mock M1).
- `.qa/bugs/ghissue-13/ui-marketplace-browse--long-description-word-overflows.md` — still reproduces (mock M9: document 3020 px in 1366 px).
- `.qa/bugs/ghissue-13/ui-marketplace-browse--status-dot-over-price.md` — still reproduces (live, 9/9 cards).
- `.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md` — still reproduces (problem 3).
- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` — still reproduces (the card injects `details.name` as HTML on a mocked response; the live API still accepts HTML field names). Major: FAIL even without problem 1.

## Automation
Branch `test/ui-mocked-marketplace-browse` (PR: pending approval). `tests/ui-mocked/marketplace/browse.spec.ts` + `browse.params.ts`, 5 tests on mocks:
- a page of offers (3 cards: type, price, seller, details, description; one page), a full page (9 offers, still one page), several pages (10 offers: page 1 = 9 cards, page 2 = 1);
- no offers: "No offers available", pagination still rendered;
- a 500: the toast shows the API's error text and the balance still loads (pass); "Failed to load offers" in place of the list is `test.fail()` linked to `.qa/bugs/ghissue-15/ui-marketplace-browse--failed-load-spins-forever.md`.
Stability 50/50 (`--repeat-each=10`, 4 workers), slow network 4/4 (before the reviewer's additions). Poison: 13 + 8 broken variants, each failed on its target assertion. Fresh test reviewer: 6 fixes applied (incl. the 9-offer row an off-by-one page-count mutant slipped past); 4 decisions left for the human (in the PR).

## Lessons applied
- Read the served frontend source first to list the states, then proved each one in the browser. The source suggested "Failed to load offers" for a 500; the browser showed an endless spinner.
- Mocked only the endpoint under test, so every other call stayed real.
- Gave V and S non-round balances (13.57, 21.09), although Browse moves no money.
