# Marketplace: seller lists an item (UI) — handoff to the test writer

**Run:** 2026-11-26-issue-13-marketplace-seller-lists-an-item · **Env:** http://localhost:3000 · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Verdict:** FAIL (two major security problems on the flow, both known bugs) — the Create Offer form lists a field or an animal group, shows "Offer created successfully!", the offer appears in My Offers and in another user's Browse (not in the seller's). The findings are around the flow: no double-submit guard, already-listed items still offered in the dropdown, a long word in a description breaks the page width, the known field-name XSS.

## Seed recipe
- Scripts (all in `{RUN_DIR}/scratch/`):
  - `lib.mjs` / `helpers.mjs` — register, fund, newField, newAnimal, `list`, `cancel`, `buy` (copied from the issue-12 run; emails `qa.t3.*@example.test`).
  - `seed.mjs` — seller S1 (23.45 ROL) with fields A, B, C, a free animal group G1 (pig ×2) and G2 (cow ×3) on field C; observer O (7.89 ROL) with its own field. `seed2.mjs` … `seed-many.mjs` add more fields and offers.
  - `relogin.mjs <key>` — logs a seeded user in again and stores the new token. `cookies.mjs <key>` — writes a playwright-cli `run-code` file that logs the browser in through cookies.
  - `mkcase.mjs` + `runcase.sh '<json>'` — drives one Create Offer form case (select type, item, price, description, submit) and records the POST bodies, responses, toasts and the form state.
  - `readback.mjs <name> <offerId> '<expected>'` — reads an offer back as the seller (My Offers, own Browse) and as the observer (Browse).
- Use the existing framework pieces. They already do what the story asks:
  - `createUser`, `createField`, `createAnimal` and `fundUser` (`src/fixtures/api.fixtures.ts`)
  - `createItem`, `createOffer` and `readMarket` (`src/fixtures/marketplace.fixtures.ts`)
  - `loginAs(user)` (`src/fixtures/ui.fixtures.ts`), which adds the five cookies from `src/ui/session.ts`
- Roles: seller and other user, both fresh from `POST /api/v1/register { email, displayedName, password }` (the `createUser` fixture). Fund them with a non-zero, non-round amount if the test reads balances. This test does not need to: creating an offer moves no money.
- Order:
  1. `createUser` (seller), then `createField(seller)`. For the right-one-picked check, create **two** fields and list the second one.
  2. `createUser` (other user).
  3. `loginAs(seller)`, then `page.goto('/marketplace.html')`.
  4. Click the Create Offer tab, fill the form, submit.
- Gotchas:
  - **A login replaces the user's previous token** (`A0`: after `POST /login`, the register token answers 403 "Invalid or expired token"). Never log the same user in through the UI or `POST /login` after `createUser` if the test also uses the register token. Cookie login with the register token avoids this.
  - The page loads `GET /fields` and `GET /animals` **once at page load**. Seed the item through the API before `goto`, or it is not in the dropdown.
  - The dropdown is filled only after Item Type changes. Select the type first, then the item by value (the item id).
  - The browser sends the token in a `token` request header (not `Authorization`), read from the `rolnopolToken` cookie (URL-encoded).
  - An animal group placed on a field (`fieldId`) and a field with animals are not in the dropdown. Create the animal group without `fieldId`.

## Verified locators / endpoints
| What | Locator / request | Response / state | Note |
|---|---|---|---|
| Cookie login | cookies on `localhost`, path `/`: `rolnopolToken` = encodeURIComponent(token), `rolnopolIsLogged` = `true`, `rolnopolUserId`, `rolnopolUserLabel` (displayedName), `rolnopolLoginTime` = encodeURIComponent(ISO time) | `/marketplace.html` loads with "Welcome, <displayedName>" and the balance | exactly `src/ui/session.ts`. Backend `POST /login` sets only `rolnopolToken` and `rolnopolLoginTime` (Set-Cookie, Max-Age 86400, SameSite=Lax). No localStorage is needed |
| Page | `page.goto('/marketplace.html')` | URL stays `/marketplace.html` for every tab (no hash/route per tab) | |
| Create Offer tab | `getByRole('button', { name: 'Create Offer' })` **while the form is hidden**; once the tab is open there are two such buttons → scope: `page.locator('.tab-button[data-tab="create"]')` | form `#createOfferForm` visible | **no test id** on tabs, form or fields. The only test ids on the page are nav links and the confirmation modal (`artifacts/testids-marketplace.json`) |
| Item Type | `getByLabel('Item Type')` → `selectOption('field' \| 'animal')` | options "Select item type", "Field", "Animal" | no test id |
| Item | `getByLabel('Item', { exact: true })` → `selectOption(String(itemId))` | field option text `"<name> (<area> ha)"`, animal `"<type> (<amount> units)"` | no test id; `exact` is needed (else it matches "Item Type") |
| Price | `getByLabel('Price (ROL)')` → `fill('12.34')` | `<input type=number min=1 step=0.01 required>` | values below 1 or with 3 decimals are blocked by the browser, no request (open bug) |
| Description | `getByLabel('Description (optional)')` | textarea, no maxlength, no counter | |
| Submit | `page.locator('#createOfferForm').getByRole('button', { name: 'Create Offer' })` | `POST /api/v1/marketplace/offers` with `{ itemType, itemId: <int>, price: <float>, description }` → HTTP **200** (known bug, `message: 201`) `data.offer.{id, sellerId, itemType, itemId, price, description, status: "active"}` | wait for this response (`page.waitForResponse`) to get the offer id |
| Success message | `page.getByRole('alert').filter({ hasText: 'Offer created successfully!' })` | toast `.notification.success`, title "Success", text **"Offer created successfully!"** (with "!"; the API's own message has none), `role="alert"`, visible 6 s, max 3 toasts | after success the form resets: type "", item list back to "Select an item", price "", description "" |
| Error message | `getByRole('alert').filter({ hasText: '<server error>' })` | `.notification.error`, title "Error", text = the API `error` verbatim ("Item is already offered for sale", "Item not found or not owned by user", "Description contains invalid characters"); client checks: "Description cannot exceed 300 characters." (no request) | the form keeps its input after an error |
| My Offers tab | `getByRole('button', { name: 'My Offers' })` | container `#myOffers`, one `.offer-card` per own offer, **all statuses**, oldest first (API order) | no test id |
| My Offers card | scope by offer id: `page.locator('#myOffers .offer-card').filter({ has: page.locator('button[data-offer-id="<id>"]') })` | text: badge "Field"/"Animal", `"<price> ROL"`, title = field name (own field) or `animal #<id>`, "Offered by: <displayedName>", "Field: <name>, Area: <area> ha" or "Type: <type>, Amount: <n>", description; button "Cancel" (enabled when active) | status classes `offer-active` / `offer-sold` / `offer-cancelled` / `offer-unavailable`, plus status text "(Sold)", "(Cancelled)" |
| Header counter | "MY OFFERS" stat in the header | counts **active** offers only (10 with 12 cards) | don't use it for a count |
| Other user sees it (API) | `GET /api/v1/marketplace/offers` with the other user's token (`readMarket` fixture / `MarketplaceApi`) | `data.offers[]` contains the offer `{ id, sellerId, itemType, itemId, price, description, status: "active", details: { name, area }, sellerLabel }` | filter by offer id, never by list length (1100+ active offers, demo data included) |
| Seller does not see it in Browse (API) | same call with the seller's token | no offer with `sellerId === seller.id` | |
| Browse in UI (if ever needed) | `getByPlaceholder('Filter offers by any text...')` → fill the field name; cards in `#browseOffers`, `button.btn-buy[data-offer-id]` | 9 per page by default, so a new offer is usually not on page 1 without the filter | for other users the card title is `field #<itemId>`; the name is in the "Field: …" line |

## Automation candidates
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| U1 seller lists a field (the T3 scenario) | AC-1, AC-3 | UI + API read-back | seller with fields A and B, picks **B**, price 12.34, a Polish description → toast "Offer created successfully!"; My Offers card for the new id shows B's name, "12.34 ROL", the description, enabled Cancel; `POST` stored `{ itemType: 'field', itemId: B.id, price: 12.34, description }`; other user's `GET /marketplace/offers` contains the offer `active` with `details.name = B.name`; seller's own browse does not | field A stays unlisted (seller's active offers = exactly B); seller's browse lacks it while the observer's has it (`U1-api-readback.json`) |
| U2 animal group (optional second case of the same spec) | AC-1 | UI + API | animal group (pig ×2, no field), price 7.07, empty description → toast; card "Type: pig, Amount: 2"; stored `description: ""` | the animal group on a field is not in the dropdown (U3) |
| U4 already-listed item via the form | AC-1/AC-2 | UI | pick the field listed in U1 again → error toast "Item is already offered for sale", form keeps its values, still one active offer | first create succeeded |
| U6i/U6j validation messages through the screen | AC-1 | UI | 301-char description → toast "Description cannot exceed 300 characters." and **no request**; description `"Czy kupisz?"` → toast "Description contains invalid characters", nothing stored | 300-char Polish description accepted (U7a) |
| U6e price 0.5 | AC-1 | UI | expected: created at 0.5. Today the browser blocks it → `test.fail()` linked to `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md` | price 1 is accepted (U6l) |

Lean set for T3: U1 alone covers the story (one behaviour, one test, NFR-11). Add U4 or U6i only if a negative UI case is wanted. Every other rule is already covered by the API spec T2.

## Do not automate
- U3/U3c dropdown contents. These are useful facts, but the "already listed items are offered" behaviour is a finding, and asserting it would pin a bug.
- U9 double click, U9b slow backend, U10 session ended. These are UX findings, timing-based or about losing input. Keep them as manual repros.
- U13/U14 field-name XSS and long-word overflow. These are security and visual findings. A test for them belongs after a fix (U14 fits T5 on mocks: a description of 300 letters must not widen the page).
- A3/A4 logged-out and deleted tokens. These are API concerns. A4 deletes an account, which must not run in a parallel suite (id reuse).

## Open findings
- `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md`: the form refuses prices below 1. A UI test must not use a price below 1 unless it is under `test.fail()`.
- `.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md`: create answers 200. Don't wait for a 201.
- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`: field names render as HTML, also in My Offers. Keep seed names plain text (factories already do).
- New in this run (see report): the double submit gives two toasts, the dropdown lists already-listed items, a long word overflows the page, and the session-ended redirect loses the form. None of these touches U1 if the test clicks once and uses fresh items.

## Traps
- Two "Create Offer" buttons are visible once the tab is open (tab and submit). Scope the submit to `#createOfferForm`.
- `getByLabel('Item')` without `exact: true` also matches "Item Type".
- A toast lives 6 s and at most 3 stay. Assert it right after the click, without a fixed wait. Don't assert the toast count: other API errors on the page (any 4xx) add error toasts through the global handler.
- My Offers keeps cancelled and sold offers. Scope to the card by `button[data-offer-id]`, not by position. Its order is the API order (oldest first), so a new offer is the **last** card.
- Browse shows 9 cards per page out of 1100+ offers. Prove "another user sees it" through the API (the story asks for that), not by looking at Browse page 1.
- Compare price as a number (`12.34`). The card text is `"12.34 ROL"`; a whole price shows as `"1 ROL"`.
- `rolnopolToken` must be URL-encoded in the cookie, and the frontend decodes it. `src/ui/session.ts` already does this.
- A 403 on any page request makes the frontend delete the cookies and redirect to `/login.html`. A test that sees the login page unexpectedly is probably using a token that a later login replaced.

## Reviewer additions (not for T3)
From `review.md`. T3 stays U1 alone; these fit the API spec T2 if ever wanted.

| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|
| R3a all allowed description characters | AC-1 | API (fits T2) | description `Pole_nr 7; ok: (a) b, c. d! e - f\t…\n… ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż 0123456789` → 200, stored byte-equal | `?` and `<` refused (U6j/U6k) |
| R10 relist after cancel | AC-1/AC-3 | API | list, cancel (200), list the same item again → 200. My Offers has the cancelled and the new offer; the other user's Browse has only the new id | the first offer exists and is cancelled before relisting |
| R4 array description (after a fix) | AC-1 | API | `description: ["x"×500]` → 400; today 200 | a 301-character string → 400 |

Not worth automating: R1, R5, R8, R9, R11.
