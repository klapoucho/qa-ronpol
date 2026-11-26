# Plan — Marketplace: browse renders API data (UI on mocks), issue #15

Run: 2026-11-26-issue-15-marketplace-browse-renders-api-data · unattended · kind ui+api · app http://localhost:3000 (Rolnopol 1.126.0, Docker)

## QA summary

**What it does.** Marketplace → Browse Offers shows offer cards (type badge, price, item name, seller, item details, description, Buy Now) for active offers of other users, with a free-text filter plus a "filter by" field select, 9/18/36 per page and Prev / page numbers / Next. With no offers it should show an empty state, and when the API fails a readable error, without breaking the page.

**Affected areas.**
- Screen `/marketplace.html`, tab Browse Offers (`#browseOffers`, `#offersPagination`, `#offersFilterInput`, `#offersFilterField`); tab My Offers (AC-3 counterpart).
- `GET /api/v1/marketplace/offers` (Browse), `GET /api/v1/marketplace/my-offers` (My Offers), plus the page-load calls a mock must answer: `authorization`, `feature-flags`, `/api/version`, `financial/account`, `financial/stats`, `financial/marketplace-stats`, `fields`, `animals`, `marketplace/transactions`, `/api/v1/statistics`.
- Role: a logged-in user (only role on this screen). Logged-out → login redirect (checked once).

**Watch for.** Source reading (`public/js/pages/marketplace.js`, `services/api-service.js`, served by the app) suggests, to be verified in the browser:
- the API takes no query params; visibility (active, not own) is server-side; filtering and pagination are client-side;
- the "9 per page" option has value `10`;
- only 5xx and malformed JSON reach the "Failed to load offers" state; 4xx (other than 401/403), network failure and timeout leave "Loading offers..." forever;
- a filter with no match shows the same text as an empty marketplace.

## Test data
- Live: viewer V (13.57 ROL) and seller S (21.09 ROL), fresh via `POST /register`; S lists 2 fields and 1 animal group (prices 4.37, 12.5, 7.01); V lists 1 field of its own (3.33) to prove it is absent from V's Browse. Script `scratch/seed.mjs`, state `scratch/seed-state.json`.
- Mocked: the browser logged in as V (cookies), `page.route('**/api/v1/marketplace/offers')` answering built offers (`scratch/mock-*.js`). Every other call stays live.

## Checks (role: viewer V unless noted)

| ID | Check | Source | Negative control |
|---|---|---|---|
| A1 | Real API contract: `GET /marketplace/offers` envelope `{success, data:{offers[], total}}`, offer shape `{id, sellerId, itemType, itemId, price, description, status, createdAt, updatedAt, details, sellerLabel}`; query params (`page`, `limit`, `itemType`, `search`) are ignored | [ADDED] for the mock writer | same response with and without params |
| A2 | Visibility via API: V's Browse contains S's offers, not V's own; S's Browse lacks S's; My Offers of V lists V's own | AC-3 [FROM STORY] | V's own offer id absent from V's Browse |
| A3 | Browse never carries non-active offers (cancel one of S's → gone from V's Browse, still in S's My Offers as cancelled) | AC-3 [ADDED] | the offer was in Browse before the cancel |
| L1 | Live UI: Browse loads; one network call for offers, no params; S's card shows badge, price, seller, details, description, enabled Buy Now; V's own offer not shown (filter by its name) | AC-3, AC-8 [FROM STORY] | filter for V's own field name → no card |
| L2 | Live UI: My Offers shows V's own offer | AC-3 [FROM STORY] | S's offer is not in V's My Offers |
| M1 | Mock: one page (3 offers: field, animal, missing sellerLabel/details) → 3 cards with type, price, seller, details; pagination 1 page, Prev/Next disabled | AC-8 [FROM STORY] | card count and per-card text differ per offer |
| M2 | Mock pagination edges: 9, 10, 18, 19, 36, 37, 100 offers → page count, cards per page, last page count, page buttons shown (max 5) | AC-8 [FROM STORY]+[ADDED] | 9 → 1 page, 10 → 2 pages |
| M3 | Page size 9 → 18 → 36 → back to 9 (count cards each time) | AC-8 [ADDED] | 18 shows 18 |
| M4 | Change page size or filter while on page N → back to page 1 with correct cards | AC-8 [ADDED] | page N content before the change |
| M5 | Filter by item type (field select "Item Type" + text "animal"), any-text, no match | AC-8 [FROM STORY] | the other type's cards disappear |
| M6 | Empty: `offers: []` → exact text, icon, where; filter, page-size and pagination still usable; tabs still work | AC-8 [FROM STORY] | M1 shows cards on the same page |
| M7 | 500 → exact text, toast text, where; filter/pagination/tabs after the error; retry (tab click) recovers | AC-8 [FROM STORY] | M1 |
| M8 | Other failures: 400, 404, 429, 401/403, network abort, timeout/slow (loading state), malformed JSON with 200, 200 without `data.offers`, partial offers | AC-8 [ADDED] | 500 shows an error |
| M9 | Statuses a mock might send (sold/cancelled/unavailable) and unknown itemType — how the card renders | [ADDED] for the mock writer | active card has an enabled Buy Now |
| V1 | Visual: grid alignment and the known card bugs re-checked at 1366×768 | regression | measured boxes |
| R1–R4 | Known bugs: card heading shows id, long word overflows, status dot over price, field name runs as HTML (via mock: no data written) | regression | |
| X1 | Logged-out user opening `/marketplace.html` → login | user expectation | logged-in V sees Browse |

Not in scope: buying and creating (issues 13/14). No money moves on this screen, so the logged-out/deleted token rule applies only to the read (X1); no account is deleted.
