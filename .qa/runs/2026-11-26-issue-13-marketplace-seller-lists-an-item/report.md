# Marketplace: seller lists an item (UI) — FAIL

**Source:** https://github.com/klapoucho/qa-ronpol/issues/13 (no linked PR) · **Run:** 2026-11-26-issue-13-marketplace-seller-lists-an-item · **Env:** http://localhost:3000 · **Platforms:** web, installed Google Chrome 158.0.8127.88 (playwright-cli 0.1.24 default `chrome` channel, 1366×768, cookie login), API (Node fetch with `X-Synthetic-Token`) · **App version:** Rolnopol 1.126.0 (Docker `jaktestowac/rolnopol:1.126.0`) · **Date:** 2026-11-26
**Roles tested:** registered user as seller and as another user (fresh accounts, cookie login) · **Skipped:** admin (no admin rule in the story); demo accounts (QA settings forbid them)

The verdict is FAIL because two major security problems sit on the story's own flow: a field name with HTML runs as script on the offer card the seller creates (now also in My Offers), and a deleted account's token still creates fields whose live offer the next registered user inherits. Both are known bugs that this story's flow reaches; the acceptance criteria themselves pass.

The Create Offer form works for both item types.
- **Field:** a seller picked the second of two free fields, entered 12.34 and a Polish description, and got "Offer created successfully!". The form reset, and the card showed in My Offers with the name, price, description and an enabled Cancel button.
- **API read-back:** the offer was stored exactly as typed. Another user's Browse API listed it, and the seller's own did not.
- **Animal group:** the same flow passes with an empty description.
- **Validation:** wrong input through the form is refused with a readable message, and the form keeps its values.
- **Boundaries:** the 300-character Polish description and the price of 1 pass through the screen.

The findings are about the flow around those criteria. The fresh-context reviewer confirmed the PASS (GAPS CLOSED, `review.md`) and added five minor/cosmetic problems (8–11, 13).

Tester findings: No double-submit guard and no loading state; already-listed items are still offered in the dropdown; a long word in a description widens every buyer's page; a session ended elsewhere throws away the typed offer. The known field-name XSS still runs, in My Offers too.

## Problems (user-facing)

### 1. A field name with HTML still runs as script on the offer card, now also in the seller's own My Offers — major (security, known bug)
- **Steps:**
  1. Seller: `POST /api/v1/fields { name: "QA<b>bold</b><img src=x onerror=\"document.title='QA-T3-XSS'\">", area: 1.4 }`.
  2. Open Marketplace → Create Offer. The dropdown shows the name as plain text.
  3. List the field from the form.
  4. Open My Offers. Then, as another user, open Browse and filter by "bold".
- **Expected:** the name shows as text everywhere.
- **Actual:** the `<img>` is inserted into the card and `onerror` runs. The page title becomes `QA-T3-XSS`, right after the create (My Offers re-renders), and again in the other user's Browse. A cancelled offer still renders it in the seller's My Offers on every page load (404 for `/x` in the console).
- **Evidence:**
  - `artifacts/U13-html-field-name-my-offers.json` (dropdown text vs card HTML, title)
  - `artifacts/U13-html-field-name-my-offers.png`
  - `artifacts/U13b-observer-browse-html-name.json`
  - `artifacts/U13b-observer-browse-html-name.png`
  - `artifacts/console-09-my-offers-html-name.txt`
  - `artifacts/console-12-observer-browse-html-name.txt`
  - The offer was cancelled afterwards (`artifacts/cleanup-cancel-html-name-offer.json`).
- **Bug file:** `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md` (still reproduces; My Offers is a new place).

### 2. A deleted account's token still creates fields, and the next registered user inherits them along with the deleted account's live offer — major (security, extends known bugs)
- **Steps:**
  1. Register D, add 1.11 ROL, create fields f1 and f2, list f1 (offer 1582, 200).
  2. D calls `DELETE /api/v1/users/profile` → 200. Login with D's credentials → 401.
  3. With the old token: `POST /marketplace/offers` for f2 → 400 "User not found". `POST /fields` → **201** (field 1619). Listing that new field → 400 "User not found".
  4. Register a new user right away.
- **Expected:** every request with a deleted account's token answers 401 and creates nothing. A new user starts empty.
- **Actual:**
  - The new user got D's id (5707), balance 1.11, field 1619 (created after the deletion) and D's offer 1582.
  - Offer 1582 was `active` in another user's Browse after that registration, for field f1, which was removed with the account.
  - The new user could cancel 1582 (200), an offer they never created. Create offer itself is refused, so the story's criterion holds.
- **Evidence:** `artifacts/A4-deleted-account-token-create.json`, `artifacts/A4-cleanup-sink-cancels-inherited-offer.json`
- **Note:** run last, with the "sink" account registered right after the deletion so no other run inherited the id. Browse was not read between the deletion and the registration, so whether the offer left Browse after the deletion and came back with the new user was not separated (the issue-12 reviewer saw it leave, R3).
- **Bug files:** extends `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md` and `.qa/bugs/ghissue-12/post-api-marketplace-buy--deleted-account-token-buys.md` (new: `POST /fields` accepts the token; a live offer is inherited).

### 3. One long word in a description stretches every buyer's Marketplace page sideways — minor (layout)
- **Steps:** list a field with a valid 300-letter description without spaces (allowed characters only, here 300 Polish letters). Open My Offers, or open Browse as another user and filter to the offer.
- **Expected:** the text wraps inside the card.
- **Actual:**
  - The description runs about 2,100 px out of its 373 px card, over the neighbouring cards.
  - The page gets a horizontal scrollbar: document width 2,583 px in a 1,366 px viewport.
  - The card has `overflow-wrap: normal; word-break: normal`.
  - Descriptions with spaces wrap correctly (U1).
- **Evidence:** `artifacts/U14-long-word-description-overflow.json`, `artifacts/U14-long-word-description-overflow.png`, `artifacts/U14b-observer-browse-long-word-overflow.json`, `artifacts/U14b-observer-browse-long-word-overflow.png`, `artifacts/U11-my-offers-many-states.png` (full page)
- **Env/role:** seller and other user, Chrome 1366×768.
- Minor because it needs an unusual description, but one seller's offer breaks the layout for every buyer on the same Browse page.

### 4. Double-clicking Create Offer sends two requests and shows "Error" next to "Success"; on a slow connection nothing shows the request is running — minor (UX)
- **Steps:**
  1. Create Offer → Field → pick a free field → price 8.88 → double-click Create Offer.
  2. Separately, with the API delayed by 3 s, click Create Offer once and look at the form 0.7 s later.
- **Expected:** the button is disabled or shows progress while the request runs. One click gives one request and one message.
- **Actual:**
  - Two `POST /marketplace/offers` requests. One offer is stored (the server refuses the duplicate).
  - The user sees "Error: Item is already offered for sale" **above** "Success: Offer created successfully!", because the 400 came back first.
  - On the slow request the button stays enabled with the same label, with no spinner and no message for 3 s, which invites the second click.
- **Evidence:** `artifacts/U9-double-click-submit.json`, `artifacts/U9-double-submit-toasts.png`, `artifacts/U9b-slow-backend-feedback.json`, `artifacts/U9b-slow-backend-during-submit.png`
- **Severity note:** a double click is a routine action. It stays minor because nothing wrong is stored, only the feedback contradicts itself.

### 5. The Item dropdown offers items that are already listed; the user learns it only after submitting — minor (UX)
- **Steps:** list fields from the form or the API, reload Marketplace, open Create Offer → Field.
- **Expected:** items with an active offer are left out or marked, like fields with animals, which are already left out.
- **Actual:**
  - All 9 of the seller's listed fields are still offered after a fresh page load, and so is the listed animal group.
  - Picking one gives "Item is already offered for sale" only after submit (U4; the form keeps its input).
  - The list is also loaded only once per page load, so a field deleted meanwhile stays selectable and gives "Item not found or not owned by user" (U5).
- **Evidence:** `artifacts/U3c-dropdown-lists-already-offered-items.json`, `artifacts/U3c-dropdown-open.png`, `artifacts/U4-already-offered-form-state.json`, `artifacts/U4-already-offered-error.png`

### 6. When the session ends elsewhere, Create Offer sends the user to the login page without a word and the typed offer is lost — minor (UX)
- **Steps:**
  1. Fill the Create Offer form (field, price 11.11, a long description).
  2. Log the same user in somewhere else (here `POST /login` through the API; a new login replaces the old token, A0).
  3. Click Create Offer.
- **Expected:** a message such as "Your session has expired, log in again", ideally keeping the input or returning the user to the form after login.
- **Actual:** the request gets 403. The app deletes all `rolnopol*` cookies and loads `/login.html` with an empty form and no explanation in view. The typed offer is gone.
- **Evidence:** `artifacts/U10-form-filled-before-session-end.png`, `artifacts/U10-session-ended-while-form-filled.json`, `artifacts/U10-after-submit-redirected.png`, `artifacts/A0-login-replaces-previous-token.json`
- 403 instead of 401 is the known `.qa/bugs/ghissue-11/post-api-auth-token--invalid-token-403.md`.

### 7. The description rules are invisible until submit, and the error does not say which character is wrong — minor (UX, AC-1 "a message naming the problem")
- **Steps:** Create Offer → description "Czy kupisz?" (a question mark) → Create Offer. Then a 301-character description.
- **Expected:** the form says up front what is allowed (or counts characters). A refusal names the character or the allowed set.
- **Actual:**
  - "Description contains invalid characters" for a plain question mark, with no hint which character is wrong. Quotes and `/` are refused the same way.
  - The length limit shows only at submit ("Description cannot exceed 300 characters."). There is no counter and no `maxlength`.
- **Evidence:** `artifacts/U6k-description-question.json`, `artifacts/U6j-description-lt.json`, `artifacts/U6i-description-301.json`

### 8. Letters outside the Polish alphabet are refused as "invalid characters" — minor (AC-1 wording) (reviewer R-1)
- **Steps:** Marketplace → Create Offer → Field → a free field → price 4.56 → description `Café Müller Straße` → Create Offer.
- **Expected:** AC-1 allows "letters (including Polish)", so é, ü and ß are accepted. The same goes for Polish letters typed or pasted in decomposed form (`a` + combining ogonek), which look the same as `ą`.
- **Actual:** toast "Description contains invalid characters" (400) in both cases. Only A–Z and the 18 Polish letters pass. The message does not say which character is wrong (report problem 7).
- **Evidence:** `artifacts/review/R3-description-charset-cases.jsonl`, `artifacts/review/R3b-non-polish-letters-refused.png`. Positive control on the same path: R3a.
- **Env:** http://localhost:3000, Rolnopol 1.126.0, Google Chrome 158.0.8127.88, 1280×720, seller qa_rvsell_a428ca2c. Frequency 3/3.
- **Note:** if "Polish letters only" is intended, AC-1 should say so. This needs the author's decision.

### 9. A description sent as a JSON array gets past the 300-character limit and is stored as an array — minor (crafted API input) (reviewer R-2)
- **Steps:** `POST /api/v1/marketplace/offers` with `{ itemType: "field", itemId: <own free field>, price: 2.22, description: ["x" repeated 500 times] }`.
- **Expected:** 400, as for a 301-character string ("Description cannot exceed 300 characters"), or 400 for a wrong type.
- **Actual:** 200. The offer is stored with `description` as an array, and other users' Browse serves it as 500 characters. In the UI the 500-character word runs out of its card and widens the page to 4,071 px (report problem 3).
- **Evidence:** `artifacts/review/R4-description-array-bypasses-limit.json`, `artifacts/review/R5-my-offers-huge-price-and-array-description.png`. Offer 1584, cancelled afterwards.
- **Env:** API, Rolnopol 1.126.0, seller id 5708.

### 10. On a phone the Marketplace tab bar is wider than the screen — minor (layout, user expectation) (reviewer R-3)
- **Steps:** set the viewport to 375×812, open Marketplace as a logged-in user, then Create Offer.
- **Expected:** the four tabs fit or wrap, and the page does not scroll sideways (the home page doesn't).
- **Actual:** the tab bar ends at 397 px, so "Transaction History" is cut off at the right edge and the page scrolls 22 px sideways. The form itself stacks into one column and works: the offer is created and the card fits.
- **Evidence:** `artifacts/review/R8-mobile-375-create-form.json`, `artifacts/review/R8-mobile-375-create-form.png`
- **Env:** Google Chrome 158.0.8127.88, 375×812 (desktop UA), seller qa_rvsell_a428ca2c.

### 11. Any price is accepted without a check, and one offer takes over the shared TOTAL VALUE — minor (user expectation, uncertain) (reviewer R-4)
- **Steps:** Create Offer → Field → price `123456789012.34` → Create Offer. Look at the Marketplace header as any user.
- **Expected:** an upper bound or a confirmation for an implausible price. At least, a shared statistic should not be dominated by one listing.
- **Actual:** accepted at once. TOTAL VALUE in every user's header went from 506 752,73 to 123 457 295 737,19. The card shows `123456789012.34 ROL` with no thousands separator, while the header uses `123 457 295 737,19`.
- **Evidence:** `artifacts/review/R5a-R8b-form-cases.jsonl`, `artifacts/review/R5-my-offers-huge-price-and-array-description.png`, `artifacts/review/R12-readback-and-cleanup.json`
- **Env:** Google Chrome 158.0.8127.88, 1280×720, seller qa_rvsell_a428ca2c. Offer 1585, cancelled afterwards.
- **Note:** AC-1 sets only "greater than 0", so this may be intended. Reported as a question for the author.

### 12. The card heading shows an internal id instead of the item name — cosmetic
- **Actual:**
  - Other users see `field #1602` as the card heading. The name only appears in the "Field: …" line below.
  - The seller's animal card is headed `animal #1463`.
  - Line breaks typed in the description are joined into one paragraph: 13 newlines rendered as 6 wrapped lines, `white-space: normal`.
- **Evidence:** `artifacts/U12b-observer-browse-card.png`, `artifacts/U2-my-offers-dom.json`, `artifacts/U2-my-offers-animal-card.png`, `artifacts/U14-long-word-description-overflow.json` (`newlineCard1570`)

### 13. The status dot covers the end of the price on every offer card — cosmetic (reviewer R-5)
- **Steps:** open My Offers (or Browse) at 1366×768.
- **Expected:** the price is fully readable.
- **Actual:** the 12 px status dot in the card's top-right corner sits on the "L" of "ROL" on every card.
- **Evidence:** `artifacts/review/R9-status-dot-over-price.png`, `artifacts/review/R9-status-dot-vs-price.json`, and the tester's `artifacts/U1-my-offers-card.png`
- **Env:** Google Chrome 158.0.8127.88, 1366×768.

## Test cases
Per-case lines: `artifacts/ui-cases-log.txt` (form cases) and `artifacts/probe-log.txt` (API). Each U6/U7 case has its own JSON: the input, the POST bodies the page sent (0 = blocked in the browser), the responses, the toasts and the form state afterwards.

| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| U1 | PASS | seller, other user | playwright-cli + API | Field B (2nd of 2 free fields), 12.34, Polish description. Toast "Offer created successfully!", form reset, card in My Offers. Stored as typed. Other user's Browse API lists it, the seller's does not. Field A stays unlisted | AC-1, AC-3 | artifacts/U1-network-create.txt, artifacts/U1-success-toast.png, artifacts/U1-my-offers-card.png, artifacts/U1-my-offers-dom.json, artifacts/U1-api-readback.json |
| U2 | PASS | seller, other user | playwright-cli + API | Animal group pig ×2, 7.07, empty description. Toast, card "Type: pig, Amount: 2", stored `description: ""`, visible to the other user | AC-1, AC-3 | artifacts/U2-network-create.txt, artifacts/U2-animal-form-state.json, artifacts/U2-my-offers-dom.json, artifacts/U2-api-readback.json |
| U3 | PASS | seller, other user | playwright-cli | Dropdown: Field lists the two free fields, not the field with animals and not the other user's field. Animal lists the free group, not the group on a field. The other user's dropdown lists only their own field | AC-1 | artifacts/U3-dropdown-contents.json, artifacts/U3b-observer-dropdown.json |
| U3c | FAIL | seller | playwright-cli | Already-listed items are still offered after reload (problem 5). A sold field leaves the seller's list and appears in the buyer's | user expectation | artifacts/U3c-dropdown-lists-already-offered-items.json |
| U4 | PASS (UX finding) | seller | playwright-cli + API | Already-listed field from the form: toast "Item is already offered for sale", input kept, still one active offer | AC-1/AC-2 | artifacts/U4-already-offered-form-state.json, artifacts/U4-already-offered-error.png, artifacts/U4-api-readback-one-offer.json |
| U5 | PASS | seller | playwright-cli + API | Field deleted after page load, then submitted: toast "Item not found or not owned by user" (404), input kept, nothing stored | AC-1 (not owned → 404) | artifacts/U5-delete-field-after-page-load.json, artifacts/U5-item-deleted-after-page-load.json, artifacts/U5-item-gone-404-toast.png |
| U6a–c | PASS | seller | playwright-cli | Empty form, no item, no price: browser "Please select an item in the list." / "Please fill in this field.", 0 requests | AC-1 | artifacts/U6a-empty-form.json, artifacts/U6b-type-no-item.json, artifacts/U6c-no-price.json |
| U6d, U6g | PASS | seller | playwright-cli | Price 0 and −5 blocked by the browser, 0 requests | AC-1 | artifacts/U6d-price-0.json, artifacts/U6g-price-negative.json |
| U6e, U6f | FAIL (known bug) | seller | playwright-cli | Price 0.5 and 0.99 blocked ("Value must be greater than or equal to 1."), although AC-1 allows > 0 | AC-1 | artifacts/U6e-price-0.5.json, artifacts/U6f-price-0.99.json |
| U6h | PASS | seller | playwright-cli | 12.345 blocked by `step=0.01` with the two nearest values, 0 requests | assumption (API rounds to 2 dp) | artifacts/U6h-price-3-decimals.json |
| U6i | PASS (UX finding) | seller | playwright-cli | 301-char description: toast "Description cannot exceed 300 characters.", 0 requests | AC-1 | artifacts/U6i-description-301.json |
| U6j, U6k | PASS (UX finding) | seller | playwright-cli | `<b>` and `?` in the description: request sent, 400, toast "Description contains invalid characters", input kept | AC-1 | artifacts/U6j-description-lt.json, artifacts/U6k-description-question.json |
| U6l | PASS | seller, other user | playwright-cli + API | Price 1 (the form's minimum) accepted and stored as 1 | AC-1 | artifacts/U6l-price-1-boundary.json, artifacts/U6l-api-readback.json |
| U7a | PASS | seller, other user | playwright-cli + API | 300 Polish letters accepted through the screen and stored byte-equal | AC-1 | artifacts/U7a-description-300-polish.json, artifacts/U7a-api-readback.json |
| U7b | PASS | seller | playwright-cli | 300 chars with 13 newlines: sent as LF (no CRLF growth), accepted, stored equal | AC-1 | artifacts/U7b-description-300-with-newlines.json |
| U8 | PASS | seller | playwright-cli | Input kept after every refused submit (U4, U5, U6j, U6k state), reset after every success (U1, U2, U6l) | user expectation | artifacts/U4-already-offered-form-state.json, artifacts/U5-item-deleted-after-page-load.json, artifacts/U6l-price-1-boundary.json |
| U9 | FAIL | seller | playwright-cli | Double click: 2 requests, "Error" + "Success" toasts, one offer (problem 4) | user expectation | artifacts/U9-double-click-submit.json, artifacts/U9-double-submit-toasts.png |
| U9b | FAIL | seller | playwright-cli | 3 s backend delay: button enabled, no progress for 3 s (problem 4). The first attempt aborted on a script error after its click and created offer 1572; it is not evidence | user expectation | artifacts/U9b-slow-backend-feedback.json, artifacts/U9b-slow-backend-during-submit.png |
| U10 | FAIL | seller | playwright-cli + API | Session replaced while the form was filled: 403, cookies wiped, redirect to login, input lost (problem 6) | user expectation | artifacts/U10-session-ended-while-form-filled.json, artifacts/U10-after-submit-redirected.png |
| U11 | PASS | seller, other user | playwright-cli + API | 12 own offers (10 active, 1 sold, 1 cancelled) all rendered in My Offers in API order. Sold/cancelled labelled with Cancel disabled, active Cancel enabled. The other user's offer absent | AC-3 | artifacts/U11-seed-and-api-my-offers.json, artifacts/U11-my-offers-many-states.json, artifacts/U11-my-offers-many-states.png |
| U12a | PASS | seller | playwright-cli | Seller's Browse filtered to their own field name: "No offers available" | AC-3 | artifacts/U12a-seller-browse-own-offer-hidden.json, artifacts/U12a-seller-browse-filtered-empty.png |
| U12b | PASS | other user | playwright-cli | Same filter as the other user: the card with Buy Now for offer 1566 | AC-3 | artifacts/U12b-observer-browse-sees-offer.json, artifacts/U12b-observer-browse-card.png |
| U13 | FAIL (known bug) | seller, other user | playwright-cli | HTML field name runs in My Offers and Browse (problem 1) | known bug | artifacts/U13-html-field-name-my-offers.json, artifacts/U13b-observer-browse-html-name.json |
| U14 | FAIL | seller, other user | playwright-cli | Long word in a description overflows the card and the page (problem 3) | user expectation | artifacts/U14-long-word-description-overflow.json, artifacts/U14b-observer-browse-long-word-overflow.json |
| U14c | PASS | other user | playwright-cli | Form layout at 1366×768 in a 1118 px form: the three top-row controls start at the same y (497.4), labels on one line, equal gaps, description spans the row, submit right-aligned with the price box. Cosmetic: price input 34 px tall vs 35.5 px selects | user expectation | artifacts/U14c-form-geometry.json |
| A0 | PASS (fact) | user | API | A new login replaces the previous token (old token 403 "Invalid or expired token") | assumption | artifacts/A0-login-replaces-previous-token.json |
| A2 | PASS | seller, other user | API | Cancelled offer: `cancelled` in My Offers, gone from the other user's Browse (an active control offer still there) | AC-3 | artifacts/A2-cancelled-offer-visibility.json |
| A3 | PASS | user | API | After logout the old token's create is refused (403, known invalid-token-403), nothing stored. Control: the same token created an offer before logout | AC-1 (user expectation) | artifacts/A3-logged-out-token-create.json |
| A4 | PASS (create) / FAIL (fields, inheritance) | deleted user, new user | API | Deleted token create offer: 400 "User not found". But `POST /fields` 201, and the next user inherits field, balance and live offer (problem 2) | AC-1 (user expectation) | artifacts/A4-deleted-account-token-create.json, artifacts/A4-cleanup-sink-cancels-inherited-offer.json |
| R1 (reviewer) | PASS | logged-out user | playwright-cli | Direct URL /marketplace.html without cookies redirects to /login.html, no form | AC-1 (gate) | artifacts/review/R1-logged-out-direct-url.json |
| R2 (reviewer) | PASS | anonymous, seller | API | Create without token 401; another user's existing field 404 'Item not found or not owned by user' | AC-1 | artifacts/review/R2-anonymous-and-not-owned-create.json |
| R3a (reviewer) | PASS | seller | playwright-cli + API | Description with every allowed character (; _ tab newline . , : ! ( ) -, 18 Polish letters, digits) accepted and stored byte-equal | AC-1 | artifacts/review/R3-description-charset-cases.jsonl |
| R3b (reviewer) | FAIL | seller | playwright-cli | 'Café Müller Straße' and NFD 'Zielona łąka' refused: 'Description contains invalid characters' | AC-1 ('letters (including Polish)') | artifacts/review/R3b-non-polish-letters-refused.png |
| R4 (reviewer) | FAIL | seller | API | description sent as a 500-char array: 200, stored as an array, bypasses the 300 limit (a 301-char string is refused) | AC-1 | artifacts/review/R4-description-array-bypasses-limit.json |
| R5 (reviewer) | FAIL | seller, other user | playwright-cli + API | Price 123456789012.34 accepted from the form; shared TOTAL VALUE header jumps to 123 457 295 737,19 | user expectation | artifacts/review/R5-my-offers-huge-price-and-array-description.png |
| R6 (reviewer) | PASS | seller | API | Listing moves no money and adds no transaction | user expectation | artifacts/review/R6-listing-moves-no-money.json |
| R7 (reviewer) | PASS | seller | playwright-cli | Cancel-confirmation modal escapes an HTML field name (not a new sink of the known XSS) | known bug | artifacts/review/R7-confirm-modal-field-name-html.json |
| R8 (reviewer) | FAIL | seller | playwright-cli | 375x812: form stacks and creates the offer, card fits; tab bar 397 px wide, 'Transaction History' cut off, page scrolls sideways | user expectation | artifacts/review/R8-mobile-375-create-form.png |
| R9 (reviewer) | FAIL | seller | playwright-cli | Status dot overlaps the 'L' of 'ROL' on every offer card | user expectation | artifacts/review/R9-status-dot-over-price.png |
| R10 (reviewer) | PASS | seller, other user | playwright-cli + API | List, cancel through the modal, relist the same field through the form; My Offers shows both; Browse shows only the new one | AC-3 | artifacts/review/R10-relist-after-cancel.jsonl |
| R11 (reviewer) | PASS | seller | playwright-cli | Price typed as '12,34' (keystrokes) sent and stored as 12.34 | user expectation | artifacts/review/R11-price-comma-typed.json |
| R12 (reviewer) | PASS | seller, other user | API | Seller's Browse has 0 own offers; other user sees exactly the 6 active ones, not the cancelled ones | AC-3 | artifacts/review/R12-readback-and-cleanup.json |
| R13 (reviewer) | PASS | other user | playwright-cli | My Offers empty state 'You have no active offers', 0 console errors | AC-3 | artifacts/review/R13-my-offers-empty-state.json |

## Console
Every console file was saved after a navigation or page load (`artifacts/console-*.txt`). Console output accumulates per page load, so a later file repeats earlier errors of the same page.
- **0 errors:** login page (01), first Marketplace load (02), My Offers (03), re-login as the seller (08), the other user's Marketplace (11, 14), and the session-ended redirect to the login page (07). Files 03, 08, 11 and 14 are byte-identical "0 errors" outputs. They are console records only, not evidence for any PASS.
- **400 for `POST /marketplace/offers`** (04, 05): expected. It is the refused duplicate in U4, shown to the user as a toast.
- **404 for `POST /marketplace/offers`** (06): expected. It is the deleted field in U5.
- **404 for `/x`** (09, 10, 12, 13, 15): the `<img src=x>` from the HTML field name (problem 1). In 13 and 15 (byte-identical), the seller's My Offers still renders the cancelled offer.
- No other errors.

## Not verified / blocked
- **Firefox/WebKit and Playwright's bundled Chromium:** installed Google Chrome 158 only (tester 1366×768; the reviewer added 1280×720 and 375×812, R8).
- **Animal group "not owned" through the form:** the form only lists own items. 404 for another user's item is covered by the API (issue-12 A10) and by the deleted-field case U5.
- **Browse pagination and filters:** not this story (T5).
- **Deleted account between deletion and the next registration:** Browse was not read in that window (problem 2 note).

## Assumptions
- Unattended run: the plan was not approved by a human (`plan.md`).
- A double submit (problem 4) and the stale dropdown (problem 5) are reached through routine actions but store nothing wrong. They are rated minor, not major, and the reason is given in each problem.
- "A message naming the problem" (AC-1) is read as: a user can tell what to change. A generic "invalid characters" for `?` is reported as UX (problem 7), not as an AC-1 failure, because the API message matches the rule.
- Price with 3 decimals blocked by the browser is accepted as intended (the API rounds to 2 dp).
- The deleted-account probe (A4) ran last. A sink account was registered immediately to absorb the reused id, so no other parallel run inherited it.

## Regression checks of known bugs
- `.qa/bugs/ghissue-12/ui-marketplace-create--price-below-one-refused.md`: still reproduces (U6e 0.5, U6f 0.99; price 1 accepted, U6l).
- `.qa/bugs/ghissue-12/ui-marketplace-browse--field-name-runs-as-html.md`: still reproduces, also in the seller's own My Offers (U13, problem 1).
- `.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md`: still reproduces (price 0 → "Missing required fields: itemType, itemId, price"; "12abc" → 200 stored as 12) (`artifacts/R1-known-invalid-price-spot-check.json`).
- `.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md`: still reproduces (HTTP 200, `message: 201`, U1/U2 network).
- `.qa/bugs/ghissue-11/put-api-marketplace-offers--item-edited-after-listing.md`: still reproduces. A 100 ha field listed as "Duże pole 100 ha" is renamed to 0.01 ha; the offer stays active, and Browse shows the new details next to the old description and price (`artifacts/R2-known-item-edited-after-listing.json`).
- `.qa/bugs/ghissue-11/post-api-auth-token--invalid-token-403.md`: still reproduces on create (A3, U10).
- `.qa/bugs/ghissue-12/post-api-register--new-user-inherits-deleted-account.md`: still reproduces, now with an active offer and a post-deletion field (A4, problem 2).

## Automation
Branch `test/ui-seller-lists-item`, [PR #28](https://github.com/klapoucho/qa-ronpol/pull/28): one UI test, `tests/ui/marketplace/create-offer.spec.ts` › "seller lists a field in the form; it shows in My Offers and other users can browse it" (T3, AC-1 + AC-3), with a new `MarketplacePage` page object, an `OfferCard` component and a `marketplacePage` fixture. Sized to the five-test task: no animal-group, validation or known-bug cases (T2 covers the rules over the API; the findings stay in the bug files).
- Stability: 10/10 (`--repeat-each=10 --retries=0 --workers=4`), slow network (400 ms, 400 kbit/s) pass.
- Poison: 8/8 failed at the targeted assertion, 5 of them partial breaks (first field listed, description dropped, wrong reader for the seller's Browse, wrong card, My Offers tab never opened).
- Fresh-context test review: no partial break that would pass; two readability fixes applied.

## Lessons applied
- Logged in through cookies with the register token. A `POST /login` replaces the token, so the first re-used token 403'd and had to be refreshed (A0 records it for the writer).
- Ran playwright-cli from `scratch/` with absolute screenshot paths (`.qa/notes/playwright-cli.md`).
- Built boundary strings in code and checked their length (300/301, Polish 18-letter set repeated with `.slice`).
- Ran the account deletion last and absorbed the reused id with a sink account.

## Retro lessons
Committed on `docs/qa-pick-lessons-issue-13` (see `summary.md`, Run notes).
