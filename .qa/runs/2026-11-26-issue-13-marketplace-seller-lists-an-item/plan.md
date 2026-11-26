# Plan — Marketplace: seller lists an item (UI) — issue #13

**Run:** 2026-11-26-issue-13-marketplace-seller-lists-an-item · **Kind:** ui+api · **Env:** http://localhost:3000 (Rolnopol 1.126.0, Docker) · **Unattended** (plan not approved by a human; executed as written)

## QA summary

- **What it does:** a logged-in farmer opens Marketplace → Create Offer, picks Field or Animal, picks one of their own items, types a price and an optional description, and submits. The app answers with a toast ("Offer created successfully!"), resets the form, and the offer appears in My Offers. Other users see it in Browse Offers; the seller does not.
- **Affected areas:**
  - Screen `/marketplace.html` tabs Create Offer, My Offers, Browse Offers (`public/js/pages/marketplace.js`, `marketplace.html`).
  - Endpoints `GET /fields`, `GET /animals` (dropdown source), `POST /marketplace/offers`, `GET /marketplace/my-offers`, `GET /marketplace/offers`.
  - Role: registered user (seller, observer). Admin and demo accounts not involved.
- **Watch for (from reading the frontend source):**
  - Dropdown lists fields without animals and animals without a field, but not filtered by "already offered", and the lists are loaded once at page load (stale after create, after a delete or sale in another tab).
  - Price input `min="1" step="0.01"` — native validation differs from the API rule (> 0, known bug).
  - Client check `description.length > 300` on the FormData value (textarea newlines may become CRLF in FormData → a 300-char text with newlines may count longer).
  - Submit button is never disabled → double submit; API errors are shown through a global toast (`api:error`), 401/403 redirect to `/login.html` (form input lost).
  - Cards are built with `innerHTML` (known field-name XSS in Browse; same template in My Offers).

## Test data
Fresh users per role through `POST /register` (no demo accounts), funds with `POST /financial/transactions` income at non-round values:
- **seller S1** (funds 23.45): field A "QA T3 Łąka A" 1.7 ha, field B "QA T3 Pole B" 2.3 ha, field C with an animal on it, animal group G1 (pig ×2, no field), animal group G2 on field C.
- **observer O** (funds 7.89): reads Browse (API + UI).
- **seller S2** for list/pagination and stale-dropdown cases; extra fields as needed.
Scripts and state in `scratch/` (`seed.mjs`, `seed-state.json`). Login in the browser through the five `rolnopol*` cookies (same as `src/ui/session.ts`).

## Checks
Markers: `[FROM STORY]` story AC/Test, `[ADDED]` from the rules. Each has a negative control.

### API claims (run first, verify the story before planning around it)
| id | check | req | negative control |
|---|---|---|---|
| A1 | `[FROM STORY]` Browse (`GET /marketplace/offers`) for O contains S1's new active offer; for S1 it does not; S1's My Offers contains it | AC-3 | S1's offer absent from S1's browse while present in O's |
| A2 | `[ADDED]` My Offers keeps cancelled offers (status shown); Browse drops them for O | AC-3 | O's browse before cancel contained it |
| A3 | `[ADDED]` Create with a logged-out token (after `POST /logout`) refused, nothing stored | AC-1 (user expectation) | same token creates right before logout |
| A4 | `[ADDED]` Create with a deleted account's token refused, nothing stored — run LAST, register a sink account right after to absorb the reused id | AC-1 (user expectation) | same token creates before deletion |

### UI — seller S1 (Google Chrome 158 via playwright-cli, 1366×768, cookie login)
| id | check | req | negative control |
|---|---|---|---|
| U1 | `[FROM STORY]` Create field offer (field B = not the first option, price 12.34, Polish description) → toast "Offer created successfully!", form reset, card in My Offers (name, price, description, Cancel), API read-back stores exactly what was typed | AC-1, AC-3 | field A stays unlisted (picked the right one); O sees it via API, S1's Browse does not |
| U2 | `[FROM STORY]` Create animal group offer (G1) → toast, My Offers card, API read-back | AC-1 | G2 (on field) not offered in the dropdown |
| U3 | `[ADDED]` Dropdown contents: Field lists A, B but not C (has animals); Animal lists G1 not G2; no other user's items | AC-1 | O's field absent |
| U4 | `[ADDED]` Already offered item (stale dropdown after U1) → server message shown, no second offer | AC-1/AC-2 | first create succeeded |
| U5 | `[ADDED]` Item gone after page load (field deleted through API) → 404 message "Item not found or not owned by user" shown, nothing stored | AC-1 (not owned → 404) | same form works for an existing item |
| U6 | `[ADDED]` Validation through the screen: no type, no item, no price → native required; price 0 / 0.5 → blocked (known bug); price 1 accepted; 12.345 → step check; description 301 → client message; description with `<` / `?` → server message "Description contains invalid characters" | AC-1 | 300-char description accepted |
| U7 | `[ADDED]` Boundary through the screen: 300-char description (Polish, with a newline) accepted and stored equal | AC-1 | 301 refused |
| U8 | `[ADDED]` Input kept after a refused submit (type, item, price, description) | user expectation | after success the form resets |
| U9 | `[ADDED]` Double submit / slow backend: one offer created, user feedback sane | user expectation | single click creates one |
| U10 | `[ADDED]` Session ended (logout in another tab) while the form is filled → what happens to the input | user expectation | — |
| U11 | `[ADDED]` My Offers with many offers (≥ 10) renders all, order recorded; cancelled/sold show status | AC-3 | — |
| U12 | `[ADDED]` Browse in UI: S1 does not see own offer; O sees it (filter by name) | AC-3 | O sees it |
| U13 | `[ADDED]` Field name with HTML: dropdown (textContent) and My Offers card (innerHTML) — re-check known bug in Browse | known bug | plain name renders as text |
| U14 | `[ADDED]` Layout: top-row form groups aligned at 1366×768, measured | user expectation | — |
| C  | Console errors saved after every navigation | — | — |

### Regression checks of known bugs
`ui-marketplace-create--price-below-one-refused` (U6), `ui-marketplace-browse--field-name-runs-as-html` (U13), `post-api-marketplace-offers--invalid-price-and-types` (API spot check price 0 / "12abc"), `post-api-marketplace-offers--create-offer-status-in-message` (A1 status), `put-api-marketplace-offers--item-edited-after-listing` (API: edit listed field, check My Offers card).
