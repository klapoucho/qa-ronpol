# Review — Marketplace: browse renders API data (UI on mocks), issue #15

**Run:** 2026-11-26-issue-15-marketplace-browse-renders-api-data · **Reviewer session:** `2026-11-26-issue-15-review` · **Env:** http://localhost:3000/marketplace.html, Rolnopol 1.126.0 (Docker) · Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; API (Node fetch with the synthetic token) · **Date:** 2026-11-26

## 1. Verdict: GAPS CLOSED

The tester's coverage holds: every PASS has evidence that shows the claimed state, and the negative controls are real. I found one gap and closed it. The tester re-checked the known field-name XSS but did not try the other text on the card. One of those inputs breaks: a field's **area** accepts HTML over the API, and the Browse card runs it in every viewer's browser (R4, new, major). Two smaller new problems: an older offers answer that arrives late overwrites the newer list (R6, minor), and the filter-field and page-size selects have no accessible name (R8, minor). The story verdict stays **FAIL**.

## 2. Coverage checklist (step 1)

| Point | Result | Note |
|---|---|---|
| Scope: AC-3 visibility | OK | Live API (A2, A3: a cancelled offer leaves Browse) and live UI (L1: V's own field name filters to nothing, while S's name finds S's card; L2: My Offers lists 1951) |
| Scope: AC-8 pagination | OK | Mocked 9/10/18/19/36/37/100 boundaries, last page, 5-button window (M2), page reset on change (M4) |
| Scope: AC-8 filter by item type | OK | M5. The page has no type dropdown; the "Item Type" field plus text is the tester's assumption, recorded |
| Scope: AC-8 empty state | OK | M6, mocked `offers: []` |
| Scope: AC-8 error | OK | M7/M8: 500, 4xx, abort, timeout, malformed 200. Problem 1 is well proven |
| Scope: user expectation | OK | Logged-out redirect (X1), offline (M8q), slow load (M8n) |
| Roles | OK | Logged-in viewer and seller; logged-out visitor in the UI and over the API (401/403). No other role reaches this screen. The deleted-token skip holds: Browse moves no money |
| Evidence | OK | Screenshots checked (M7a, M3, M1): right user, after the action, settled. The duplicate-checksum hits are only identical "0 errors" console files, never the only evidence for a PASS |
| Negative controls | OK | 9 vs 10 offers (M2a/M2b), the other type absent (M5), own offer absent with a positive filter control (L1), cancelled offer was present before (A3) |
| Input → output | OK | Read-only screen; A3 reads the cancel back over the API and in My Offers |
| Data | OK | 100 offers (12 pages), empty list, filtered-out items absent, live list of 1386+ |
| Regressions | **GAP → closed** | All 4 known Browse bugs re-checked. The field-name XSS bug claims the field name is the only open text on the card, and the tester did not test that claim. I probed description (as string, array, nested array, object), displayed name (register, profile update), animal type and field area. Field area broke (R4). The mobile tab-bar bug was skipped as out of scope, which holds |
| Tool traps | OK | Console section present and explained; state read after waits for cards, empty state or toast; direct URL used throughout |
| Report | OK, one correction | Problem 1 says one Marketplace load makes 13 API calls. 13 is right, but only **11** count against the limit: `/api/v1/statistics` and `/api/version` carry no rate-limit headers (R5). That is about 9 loads per 30 s per IP before a 429, so the severity reasoning still holds. Severities follow reachability |

## 3. Experiments

| # | Charter | Hypothesis | Result | Evidence |
|---|---|---|---|---|
| R1 | Description on the card. Risk: script runs in the buyer's browser. Breaks if the whitelist checks only strings | A description sent as an array/object skips the character check | **HELD**. HTML string 400 (control); `[html]`, `[[html]]`, `{a: html}` and `&lt;` entities: all 400 "Description contains invalid characters" | `artifacts/review/R1-R3-api-open-text.json`, `artifacts/review/R1b-api-description-shapes.json` |
| R2 | Seller label ("Offered by"). Risk: same. Breaks if the displayed name can hold HTML | HTML displayed name at register or profile update | **HELD**. Register and `PUT /users/profile` refuse HTML (400). Side note: `displayedName` as an array → **500** "displayedName.trim is not a function" (profile screen, out of this story's scope) | `artifacts/review/R1-R3-api-open-text.json` |
| R3 | Animal type on the card. Breaks if the type is free text | HTML or array type | **HELD**. 400, whitelist | `artifacts/review/R1-R3-api-open-text.json` |
| R4 | Field area on the card. Risk: stored XSS for every viewer. Breaks if area is not validated as a number | `area` with HTML is stored and runs on the card | **BROKE**. `POST /fields` and `PUT /fields/{id}` store `area: "2<img src=x onerror=…>"` (also an array). Listed (200), served in V's Browse, and the payload ran in V's live browser: title "QA-RV15-XSS-AREA", broken image on the card. Positive control: 9 other cards before the filter, title unchanged. Cleaned up (offer cancelled, areas back to 1.25) | `artifacts/review/R1c-api-field-area-shapes.json`, `artifacts/review/R4-api-area-html-offer-listed.json`, `artifacts/review/R4-live-area-html-runs-in-viewer-browse.json`, `artifacts/review/R4-live-area-html-runs-in-viewer-browse.png`, `artifacts/review/console-R4-live-area-html-runs-in-viewer-browse.txt` (the payload's 404 for `/x`), `artifacts/review/R4-cleanup.json` |
| R5 | Problem 1 reachability. Breaks the severity reasoning if browser calls skip the rate limit | A browser load of Marketplace counts against the 100/30 s per-IP limit | **HELD** (claim confirmed, count corrected). 13 API calls; 11 carry `RateLimit-Limit: 100` and use one slot each (remaining 87 → 77); none sends the synthetic token | `artifacts/review/R5-browser-load-rate-limit-headers.json` |
| R6 | Refetch race. Risk: wrong data shown. Breaks if late answers are not discarded | Two Browse refetches in flight; the older answer arrives last and replaces the newer list | **BROKE**. The fresh 3-card list showed, then 2.7 s later the stale 2-card list replaced it. Positive control: the fresh list rendered first, so the mock and the reads work | `artifacts/review/R6-stale-answer-overwrites-fresh.json`, `artifacts/review/R6-stale-answer-overwrites-fresh.png` |
| R7 | Price filter. Wrong data shown if "price" means a value or a range | Filter field "Price" plus "2" gives prices around 2 | **HELD (as designed)**. A substring text match: "2" matches all 20 mocked prices (every price ends in .25), "12" gives 12.25, ">10" gives nothing. The placeholder says "Filter offers by any text...", so this is consistent. Not filed | `artifacts/review/R7-mock-price-filter-substring.json` |
| R8 | Accessibility of the Browse controls (user expectation) | The filter field and page-size selects have an accessible name | **BROKE**. Both are an unnamed `combobox` in the accessibility tree: no label, no `aria-label`, no title. The text box gets its name from the placeholder only | `artifacts/review/R8-live-browse-a11y-snapshot.yml` (lines 62, 63, 161) |

Console in my session: only the R4 payload's own 404 for `/x` (explained); the closing read had 0 errors (`artifacts/review/console-review-session-end.txt`).

## 4. New problems

### R-1. A field's area containing HTML runs as script in every viewer's browser on the Browse card — major (security)
- **Steps:**
  1. Seller (fresh user): `POST /api/v1/fields { "name": "QA rv15 6216 pole", "area": 1.25 }`.
  2. Then `PUT /api/v1/fields/{id} { "area": "2<img src=x onerror=\"document.title='QA-RV15-XSS-AREA'\">" }` → 200. `POST /fields` with that area → 201 too, and an array area is also stored.
  3. List it: `POST /api/v1/marketplace/offers { itemType: "field", itemId: <id>, price: 2.34, description: "Pole testowe recenzenta" }` → 200.
  4. Another user opens Marketplace → Browse Offers and reaches the card (here through the filter "QA rv15 6216").
- **Expected:** the area is refused unless it is a number (the field form takes a number), or the card shows it as plain text.
- **Actual:** `GET /marketplace/offers` serves `details.area` as the HTML string. The card inserts it as HTML: a broken image appears after "Area: 2", and its `onerror` runs in the viewer's session (page title becomes "QA-RV15-XSS-AREA").
- **Who reaches it:** an attacker needs crafted API input; the victim needs none, only to view the card. The known field-name bug says the name is the only open text on the card, and this disproves it. Validating field names alone would leave this hole open.
- **Evidence:** `artifacts/review/R1c-api-field-area-shapes.json`, `artifacts/review/R4-api-area-html-offer-listed.json`, `artifacts/review/R4-live-area-html-runs-in-viewer-browse.json` (snap "filtered": title), `artifacts/review/R4-live-area-html-runs-in-viewer-browse.png`, `artifacts/review/console-R4-live-area-html-runs-in-viewer-browse.txt`.
- **Env:** http://localhost:3000/marketplace.html, Chrome 158.0.8127.88, 1366x768, Rolnopol 1.126.0; seller qa_rvatk_b3042686 (id 6216, fresh), viewer qa_viewer_766382b4 (V). Offer 1955 cancelled and areas restored after the evidence (`artifacts/review/R4-cleanup.json`).
- **Frequency:** 1/1, deterministic.
- **Relation:** the same card code as `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` (every card value goes into `innerHTML`), but a different input with its own server-side gap.

### R-2. A late answer from an earlier offers request replaces the newer list — minor
- **Steps (mocked timing):** 1. Browse Offers loaded. 2. Click the Browse Offers tab, then click it again 0.3 s later. 3. The first request answers after 3 s, the second at once.
- **Expected:** the list from the latest request stays.
- **Actual:** the newest list (3 offers) shows, then at 3.2 s the older answer (2 offers) replaces it. Nothing stops a late answer from rendering.
- **Who reaches it:** needs two Browse loads in flight (a double click on the tab, or a tab click while the refetch after a buy/create/cancel runs) and a change in between. The user then sees an offer that is gone, and Buy Now on it fails. Timing-dependent, so minor.
- **Evidence:** `artifacts/review/R6-stale-answer-overwrites-fresh.json` (snaps "fresh-answered" and then "stale-answered-last"; the request log shows request 2 answered at 482 ms and request 1 at 3160 ms), `artifacts/review/R6-stale-answer-overwrites-fresh.png`.
- **Env:** as R-1, viewer V, `GET /api/v1/marketplace/offers` mocked with `page.route`; every other call live.

### R-3. The "filter by" and "per page" selects on Browse have no accessible name — minor
- **Steps:** Browse Offers, read the accessibility tree (or use a screen reader).
- **Expected:** each control is announced with its purpose ("Filter field", "Offers per page").
- **Actual:** both selects are announced as a bare "combobox" (no `<label>`, `aria-label` or title). The filter text box has only its placeholder as its name.
- **Evidence:** `artifacts/review/R8-live-browse-a11y-snapshot.yml` (lines 62, 63, 161).
- **Env:** as R-1, viewer V, live.
