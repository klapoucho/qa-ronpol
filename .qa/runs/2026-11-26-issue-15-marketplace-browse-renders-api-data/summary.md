<!-- qa-pick summary · run 2026-11-26-issue-15-marketplace-browse-renders-api-data -->
## 🧪 QA: Marketplace: browse renders API data (UI on mocks) — ❌ FAIL

| | |
|---|---|
| **Run** | `2026-11-26-issue-15-marketplace-browse-renders-api-data` · 2026-11-26 |
| **Env** | http://localhost:3000/marketplace.html · Rolnopol 1.126.0 (Docker) · Google Chrome 158.0.8127.88 (playwright-cli 0.1.24), 1366x768 / API |
| **Tested** | issue #15, no linked PR. Live app, plus a mocked `GET /api/v1/marketplace/offers` (Playwright `page.route`) for empty, error and pagination edges |
| **Roles** | registered user as viewer and as seller · logged-out visitor · skipped: deleted-account token — Browse moves nothing, and it would need a deletion |
| **Reviewer** | GAPS CLOSED — coverage and evidence hold; the one gap (other open text on the card) broke with a new stored XSS through the field area |
| **Automation** | branch `test/ui-mocked-marketplace-browse`: 5 ui-mocked tests (page, full page, several pages, no offers, 500 — the in-list error is an expected failure until problem 1 is fixed) · 50/50 stable · PR pending |

**How Browse works:** one call, `GET /api/v1/marketplace/offers`, no query params; the server returns every active offer of other users (AC-3 holds). Type filter, 9/18/36 per page and pagination all run in the browser. Empty list → "No offers available" (works). Failed load → see problem 1.

### Problems

> [!CAUTION]
> **1. When loading the offers fails, Browse shows "Loading offers..." forever** · major · `.qa/bugs/ghissue-15/ui-marketplace-browse--failed-load-spins-forever.md`
>
> **Steps:** 1. Log in, open Marketplace → Browse Offers. 2. The offers request fails: 500, 502, 400, 404, 429, network failure, or no answer in 15 s (mocked).<br>
> **Expected (AC-8):** a readable error in the list that stays, the page still usable, a way to retry.<br>
> **Actual:** the spinner stays for good; the only error is a toast that disappears after 6 s. Typing a filter afterwards shows "No offers available", as if the marketplace were empty. The page's own "Failed to load offers" state appears only for a 200 without `data`. No retry control. A 429 needs no crafted input: one Marketplace load makes 11 rate-limited calls, so about 9 quick loads per 30 s per IP trigger it.
>
> ![Browse after a 500: toast gone, "Loading offers..." still shown](https://github.com/user-attachments/assets/6b583ae9-6af1-4e0d-a0a8-7ce70cd420b4)

> [!CAUTION]
> **2. A field's area containing HTML runs as script in every viewer's browser on the Browse card** · major (security) · `.qa/bugs/ghissue-15/post-api-fields--area-accepts-html-runs-on-card.md`
>
> **Steps:** 1. Seller: `PUT /api/v1/fields/{id}` with `area: "2<img src=x onerror=…>"` → 200 (`POST /fields` → 201 too). 2. List the field. 3. Another user opens Browse Offers.<br>
> **Expected:** an area that is not a number is refused, and the card shows values as plain text.<br>
> **Actual:** the card inserts the area as HTML and the `onerror` runs in the viewer's session (live: page title changed). The known field-name XSS fix alone would leave this open.
>
> ![Browse card with a broken image after "Area: 2", script ran](https://github.com/user-attachments/assets/e7934727-82f1-4901-830f-3386ae3c4e41)

> [!CAUTION]
> **Known, still reproduces: a field name containing HTML runs as script on the offer card** · major (security) · `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`

> [!WARNING]
> **3. Known, still reproduces: "9 per page" shows 10 offers once the page size was changed** · minor · `.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md`
>
> **Steps:** Browse Offers → 18 per page → 9 per page.<br>
> **Expected:** 9 cards per page. **Actual:** 10 cards, page count follows 10 (the option's value is `10`).
>
> ![Page 3 of 3 with 10 cards while "9 per page" is selected](https://github.com/user-attachments/assets/7b372132-e516-4358-84ee-9046cd5ed09f)

> [!WARNING]
> **4. Error toasts show raw technical text** ("Failed to fetch", "signal timed out", "Invalid JSON response") · minor · `.qa/bugs/ghissue-15/ui-marketplace-browse--raw-network-error-text.md`

> [!WARNING]
> **5. A late answer from an earlier offers request replaces the newer list** (two Browse loads in flight) · minor · `.qa/bugs/ghissue-15/ui-marketplace-browse--late-answer-replaces-newer-list.md`

> [!WARNING]
> **6. The "filter by" and "per page" selects have no accessible name** · minor · `.qa/bugs/ghissue-15/ui-marketplace-browse--selects-without-accessible-name.md`

> [!NOTE]
> **7. One failed 5xx load shows the same error toast twice** · cosmetic · `.qa/bugs/ghissue-15/ui-marketplace-browse--error-toast-shown-twice.md`

> [!NOTE]
> **8. A filter with no match says "No offers available"**, the same as an empty marketplace · cosmetic · `.qa/bugs/ghissue-15/ui-marketplace-browse--no-match-says-no-offers.md`

> [!NOTE]
> **9. The empty state sits in the first card column, not in the middle of the list** · cosmetic · `.qa/bugs/ghissue-15/ui-marketplace-browse--empty-state-off-centre.md`
>
> ![Empty Browse: "No offers available" left of centre](https://github.com/user-attachments/assets/2dcd5a7a-1036-4885-9a7e-e72bf706c882)

Outside this story, filed for the record: `PUT /api/v1/users/profile` with `displayedName` as an array answers 500 (minor) · `.qa/bugs/ghissue-15/put-api-users-profile--array-displayed-name-500.md`

### Not verified

- A real 429 from the live server — it would throttle the shared IP; mocked with the server's own body.
- A real server 500 — cannot be caused without changing the app; mocked.
- Mobile viewport — out of scope.

<details>
<summary><b>Test cases</b> — 21 ✅ · 13 ❌ · 3 ℹ️ (R… = reviewer experiments)</summary>

| # | | Role | Case | Requirement | Evidence |
|---|---|---|---|---|---|
| A1 | ✅ | V | API contract `{success,timestamp,data:{offers,total}}`, only active, query params ignored | AC-8 (mock input) | `artifacts/A1-browse-api-contract.json` |
| A2 | ✅ | V, S | Browse has other users' offers, never own; My Offers = own | AC-3 | `artifacts/A2-visibility-api.json` |
| A3 | ✅ | S, V | Cancelled offer leaves Browse, stays in My Offers as cancelled | AC-3 | `artifacts/A3-cancelled-offer-leaves-browse.json` |
| A4 | ✅ | V | Live shapes of all page-load calls | writer input | `artifacts/A4-page-load-response-shapes.json` |
| L1 | ✅ | V | Live: 9 cards, S's card values right, V's own field filters to nothing | AC-3, AC-8 | `artifacts/L1-live-browse.json` |
| L2 | ✅ | V | Live: My Offers shows V's offer, not S's | AC-3 | `artifacts/L1-live-browse.json` |
| M1 | ✅ | V | 3 offers → 3 cards with type, price, seller, details; 1 page | AC-8 | `artifacts/M1-mock-one-page.json` |
| M2 | ✅ | V | 9/10/18/19/36/37/100 offers: page counts, last page, 5-button window | AC-8 | `artifacts/M2a…M2h-*.json` |
| M3 | ❌ | V | "9 per page" re-selected shows 10 (problem 3) | AC-8 | `artifacts/M3-mock-page-size-9-shows-10.json` |
| M4 | ✅ | V | Page resets to 1 on size, filter, field or tab change | AC-8 | `artifacts/M4b-mock-browse-tab-on-page-2.json` |
| M5 | ✅ | V | "Item Type" + "animal"/"field" → only that type | AC-8 | `artifacts/M5-mock-filter-item-type.json` |
| M6 | ✅ | V | `offers: []` → "No offers available", page still works | AC-8 | `artifacts/M6-mock-empty.json` |
| M7 | ❌ | V | 500 → endless spinner, toast for 6 s (problem 1) | AC-8 | `artifacts/M7a-mock-500.json` |
| M8a–d | ❌ | V | 502 / 400 / 404 / 429 → endless spinner + toast | AC-8 | `artifacts/M8a…M8d-*.json` |
| M8e–f | ✅ | V | 401/403 → logged out to /login.html | user expectation | `artifacts/M8e-mock-401.json` |
| M8g–h | ❌ | V | Network failure → endless spinner + "Failed to fetch" | AC-8 | `artifacts/M8g-mock-abort-failed.json` |
| M8i–m | ✅ | V | 200 without `data` → "Failed to load offers" state | AC-8 | `artifacts/M8i-mock-malformed-json-200.json` |
| M8n | ✅ | V | 3 s delay → "Loading offers..." then cards | user expectation | `artifacts/M8n-mock-slow-3s.json` |
| M8o–p | ❌ | V | No answer → toast "signal timed out" at ~15 s, spinner stays | AC-8 | `artifacts/M8p-mock-hang-no-input.json` |
| M8q | ✅ | V | Live offline: old cards stay, raw toast (problem 4) | user expectation | `artifacts/M8q-live-offline-browse-tab.json` |
| M9 | ℹ️ | V | Odd statuses / types / empty details | writer input | `artifacts/M9-mock-odd-offers.json` |
| M10 | ℹ️ | V | Unmocked page-load calls → 7 error toasts | writer input | `artifacts/M10-mock-unhandled-calls-501.json` |
| V1 | ✅ | V | Live grid 3 × 373 px, pagination centred | user expectation | `artifacts/V1-R3-live-grid-geometry.json` |
| V2 | ❌ | V | Empty state off-centre (problem 9) | user expectation | `artifacts/V2-mock-empty-state-geometry.json` |
| X1 | ✅ | visitor | Logged out → /login.html; API 401/403 | user expectation | `artifacts/X1-live-logged-out-redirect.json` |
| K1 | ❌ | V | Known: heading "field #id" | regression | `artifacts/L1-live-browse.json` |
| K2 | ❌ | V | Known: long word stretches the page | regression | `artifacts/M9-mock-odd-offers.json` |
| K3 | ❌ | V | Known: status dot over price | regression | `artifacts/V1-R3-live-grid-geometry.json` |
| K4 | ❌ | V | Known: field-name XSS | regression | `artifacts/M9-mock-odd-offers.json` |
| R1 | ✅ | seller | Description as array/object → 400 | regression | `artifacts/review/R1b-api-description-shapes.json` |
| R2 | ✅ | seller | HTML displayed name refused | regression | `artifacts/review/R1-R3-api-open-text.json` |
| R3 | ✅ | seller | HTML animal type refused | regression | `artifacts/review/R1-R3-api-open-text.json` |
| R4 | ❌ | seller, V | Field area HTML runs on the card (problem 2) | user expectation (security) | `artifacts/review/R4-live-area-html-runs-in-viewer-browse.json` |
| R5 | ✅ | V | Browser load uses 11 rate-limit slots | AC-8 (severity) | `artifacts/review/R5-browser-load-rate-limit-headers.json` |
| R6 | ❌ | V | Late answer replaces newer list (problem 5) | user expectation | `artifacts/review/R6-stale-answer-overwrites-fresh.json` |
| R7 | ℹ️ | V | "Price" filter is a text match, as the placeholder says | user expectation | `artifacts/review/R7-mock-price-filter-substring.json` |
| R8 | ❌ | V | Selects without accessible name (problem 6) | user expectation (a11y) | `artifacts/review/R8-live-browse-a11y-snapshot.yml` |

</details>

<details>
<summary><b>Known bugs re-checked</b></summary>

- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` — still reproduces (its "only open text" note is now corrected: see problem 2)
- `.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md` — still reproduces
- `.qa/bugs/ghissue-13/ui-marketplace-browse--long-description-word-overflows.md` — still reproduces
- `.qa/bugs/ghissue-13/ui-marketplace-browse--status-dot-over-price.md` — still reproduces
- `.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md` — still reproduces (problem 3; re-found as new because the run started from an out-of-date `main`)

</details>

<details>
<summary><b>Run notes</b> — agents, lessons applied</summary>

- **Agents:** QA tester — Opus 5.5 — exploratory UI + API with route mocks, one agent (the screen is small); QA reviewer — Opus 5.5, fresh context — coverage check and break attempts; test writer — Opus 5.5 — one parametrized ui-mocked spec; test reviewer — Opus 5.5, fresh context — 6 fixes applied, 4 decisions for the PR.
- **Lessons applied:** pending (retro after the test PR).

</details>

<sub>Posted by <code>/qa-pick</code> · full evidence in <code>.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/</code> · 🤖 Generated with [Claude Code](https://claude.com/claude-code)</sub>

