# QA review — Marketplace: seller lists an item (UI) — issue #13

**Run:** 2026-11-26-issue-13-marketplace-seller-lists-an-item · **Reviewer session:** `-s=2026-11-26-issue-13-marketplace-seller-lists-an-item-review` · **Date:** 2026-11-26
**Env:** http://localhost:3000, Rolnopol 1.126.0 (Docker) · installed Google Chrome 158.0.8127.88 (headless, playwright-cli 0.1.24 default browser), viewports 1280×720, 1366×768, 375×812 · API with `X-Synthetic-Token`
**Accounts (fresh):** seller `qa_rvsell_a428ca2c` (id 5708, 3.21 ROL), other user `qa_rvobse_d85d2fb9` (id 5709, 0 ROL). No account was deleted.

## 1. Verdict: GAPS CLOSED

The tester's PASS for AC-1 and AC-3 holds and is proven with read-back evidence. I closed four small gaps:
- logged-out direct URL;
- another user's existing item over the API;
- the rest of the allowed description characters;
- mobile width and the My Offers empty state.

I found five new problems, none above minor:
- letters outside the Polish alphabet are refused;
- an array description gets past the 300-character limit over the API;
- the tab bar overflows at 375 px;
- prices have no upper bound, and one offer takes over the shared TOTAL VALUE;
- the status dot overlaps the price.

## 2. Coverage checklist

| Point | Result | Note |
|---|---|---|
| Scope | OK, gap closed | AC-1 and AC-3 each have checks through the screen, read back over the API (U1, U2, U4–U7, U11, U12, A2). No PR. Gap closed (R3a): `;`, `_`, a tab and digits were not proven accepted. U1 covered `. , : ! ( ) -` only. AC-1 says "letters (including Polish)", but only Polish letters were tried. R3b found that other letters are refused. |
| Roles | OK, gap closed | Seller and other user covered. Admin skip is justified (no admin rule in the story). Gaps closed: the logged-out user's direct URL to `/marketplace.html` was not tried in the UI (R1). Another user's existing item was cited from the issue-12 run only (A10), and U5 is the seller's own deleted field. I re-ran it (R2). |
| Evidence | OK | Opened U1 toast/My Offers screenshots, U1 network/read-back, U12b, U13, U14. Each shows the claimed state, role and data after the action. Byte-identical files are only `console-*.txt` outputs. The report already says they are not PASS evidence. |
| Negative controls | OK | Field A stays unlisted (U1). The seller's Browse is empty and the other user's Browse lists the offer (U12a/b). The other user's field is absent from the dropdown (U3). Cancelled offers are dropped while an active control stays (A2). 301 is refused while 300 is accepted. |
| Input → output | OK | Every accepted case is read back over the API (stored as typed) and rendered in My Offers. 300 characters with newlines is checked for CRLF growth (U7b). |
| Data | OK, gap closed | 12 offers in mixed states (U11). Filtered-out data: own offer in Browse, cancelled in Browse. Gap closed: the My Offers empty state was not seen (R13: "You have no active offers"). |
| Regressions | OK | All 7 known bugs in the area re-checked (`.qa/bugs/ghissue-11`, `ghissue-12`). |
| Tool traps | OK | A console file after every navigation. State read after `networkidle`. Toasts caught with a MutationObserver, not by a timed look. My own session: 0 console errors (`artifacts/review/R-console-error-final.txt`). |
| Report | OK | Every problem has steps, expected, actual, evidence and env. Severities follow reachability. Gap closed: mobile widths were listed as not verified (R8). |

## 3. Experiments

| # | Charter | Hypothesis | Result | Evidence |
|---|---|---|---|---|
| R1 | Logged-out user, direct URL to Create Offer — gate in UI | `/marketplace.html` without cookies shows a usable form | HELD: redirected to `/login.html`, no form, 0 console errors | `artifacts/review/R1-logged-out-direct-url.json`, `.png` |
| R2 | Create without a token, and with another user's existing field — AC-1 404 | anonymous or non-owner create stores an offer | HELD: 401 "Access token required"; 404 "Item not found or not owned by user"; the other user's My Offers stays empty | `artifacts/review/R2-anonymous-and-not-owned-create.json` |
| R3a | Every allowed description character through the form | `;` `_` a tab, a newline or digits are refused | HELD: 79 characters with the full allowed set, all 18 Polish letters and digits accepted; stored byte-equal | `artifacts/review/R3-description-charset-cases.jsonl` (R3a), `R12-readback-and-cleanup.json` (offer 1583) |
| R3b/c | Letters other than Polish, and Polish letters in decomposed (NFD) form — AC-1 "letters (including Polish)" | a description that is all letters is accepted | **BROKE**: "Café Müller Straße" → 400 "Description contains invalid characters"; "Zielona łąka" in NFD → same 400. Positive control R3a on the same path passes | `artifacts/review/R3-description-charset-cases.jsonl`, `R3b-non-polish-letters-refused.png` |
| R4 | Description of a non-string type over the API — the 300 limit | the limit or type check can be skipped | **BROKE**: a 301-character string is refused (control). `description: ["x"×500]` → 200, stored as an array, served to the other user's Browse at 500 characters, and it widens the page (as in report problem 3) | `artifacts/review/R4-description-array-bypasses-limit.json`, `R5-my-offers-huge-price-and-array-description.png` |
| R5 | A very large price through the form — money shown to everyone | an extreme price is refused or asks for confirmation | **BROKE (user expectation)**: 123456789012.34 accepted with no warning. The shared TOTAL VALUE header for every user jumped from 506 752,73 to 123 457 295 737,19. The card shows "123456789012.34 ROL", and the header uses a different format (`123 457 …,19`) | `artifacts/review/R5a-R8b-form-cases.jsonl`, `R5-my-offers-huge-price-and-array-description.json`, `.png`, `R12-readback-and-cleanup.json` (totalValue before and after cleanup) |
| R6 | Listing moves money or records a transaction | balance or history changes on create | HELD: balance 3.21 and the single seed transaction are unchanged after 2 listings | `artifacts/review/R6-listing-moves-no-money.json` |
| R7 | Field name with HTML in the cancel confirmation modal — a new sink of the known XSS? | the modal inserts the name as HTML | HELD: the modal escapes it (`&lt;i&gt;`, 0 `<i>` elements). The card title still renders `<i>` (known bug) | `artifacts/review/R7-confirm-modal-field-name-html.json`, `.png` |
| R8 | Create Offer at 375×812 (phone) | form or card unusable on a phone | **BROKE (tab bar)**: form stacks to one column, submit works, toast, card fits (x 20–355). The tab bar is 397 px wide in 375: "Transaction History" is cut off, and the page scrolls sideways. Control: home page at 375 has no overflow | `artifacts/review/R8-mobile-375-create-form.json`, `.png`, `R8-mobile-375-success-toast.png`, `R8-mobile-375-my-offers-card.json`, `.png` |
| R9 | Card header layout | price text is clear of other elements | **BROKE (cosmetic)**: the 12 px status dot (`.offer-card::after`, top 16 px, right 16 px) overlaps the "L" of "ROL" on every card (price box right edge 454, dot ≈ 446–458) | `artifacts/review/R9-status-dot-vs-price.json`, `R9-status-dot-over-price.png` |
| R10 | Relist the same field after cancelling, through the UI | the cancelled offer blocks relisting, or the history is lost | HELD: list → Cancel → modal "Cancel Offer" → 200, card "(Cancelled)". Relist through the form → 200. My Offers shows both, and the other user's Browse lists only the new one | `artifacts/review/R10-relist-after-cancel.jsonl`, `R12-readback-and-cleanup.json` |
| R11 | Price typed with a decimal comma (Polish habit), keystrokes not fill | "12,34" is refused or stored wrong | HELD: Chrome (en-GB) turns it into 12.34; sent and stored as 12.34 (offer 1590) | `artifacts/review/R11-price-comma-typed.json`, `R12-readback-and-cleanup.json` |
| R12 | Read-back of every reviewer offer as seller and other user — AC-3 | own offers leak into own Browse, or cancelled offers stay in Browse | HELD: the seller's own Browse holds 0 of their offers. The other user sees exactly the 6 active ones, without cancelled 1586/1588 | `artifacts/review/R12-readback-and-cleanup.json` |
| R13 | My Offers empty state | blank or broken container | HELD: "You have no active offers", 0 console errors | `artifacts/review/R13-my-offers-empty-state.json`, `.png` |

Cleanup: offers 1584 (array description) and 1585 (huge price) were cancelled after the evidence, so the shared TOTAL VALUE and Browse are back to normal (`R12-readback-and-cleanup.json`).

## 4. New problems

### R-1. Letters outside the Polish alphabet are refused as "invalid characters" — minor (AC-1 wording)
- **Steps:** Marketplace → Create Offer → Field → a free field → price 4.56 → description `Café Müller Straße` → Create Offer.
- **Expected:** AC-1 allows "letters (including Polish)", so é, ü and ß are accepted. The same goes for Polish letters typed or pasted in decomposed form (`a` + combining ogonek), which look the same as `ą`.
- **Actual:** toast "Description contains invalid characters" (400) in both cases. Only A–Z and the 18 Polish letters pass. The message does not say which character is wrong (report problem 7).
- **Evidence:** `artifacts/review/R3-description-charset-cases.jsonl`, `artifacts/review/R3b-non-polish-letters-refused.png`. Positive control on the same path: R3a.
- **Env:** http://localhost:3000, Rolnopol 1.126.0, Google Chrome 158.0.8127.88, 1280×720, seller qa_rvsell_a428ca2c. Frequency 3/3.
- **Note:** if "Polish letters only" is intended, AC-1 should say so. This needs the author's decision.

### R-2. A description sent as a JSON array gets past the 300-character limit and is stored as an array — minor (crafted API input)
- **Steps:** `POST /api/v1/marketplace/offers` with `{ itemType: "field", itemId: <own free field>, price: 2.22, description: ["x" repeated 500 times] }`.
- **Expected:** 400, as for a 301-character string ("Description cannot exceed 300 characters"), or 400 for a wrong type.
- **Actual:** 200. The offer is stored with `description` as an array, and other users' Browse serves it as 500 characters. In the UI the 500-character word runs out of its card and widens the page to 4,071 px (report problem 3).
- **Evidence:** `artifacts/review/R4-description-array-bypasses-limit.json`, `artifacts/review/R5-my-offers-huge-price-and-array-description.png`. Offer 1584, cancelled afterwards.
- **Env:** API, Rolnopol 1.126.0, seller id 5708.

### R-3. On a phone the Marketplace tab bar is wider than the screen — minor (layout, user expectation)
- **Steps:** set the viewport to 375×812, open Marketplace as a logged-in user, then Create Offer.
- **Expected:** the four tabs fit or wrap, and the page does not scroll sideways (the home page doesn't).
- **Actual:** the tab bar ends at 397 px, so "Transaction History" is cut off at the right edge and the page scrolls 22 px sideways. The form itself stacks into one column and works: the offer is created and the card fits.
- **Evidence:** `artifacts/review/R8-mobile-375-create-form.json`, `artifacts/review/R8-mobile-375-create-form.png`
- **Env:** Google Chrome 158.0.8127.88, 375×812 (desktop UA), seller qa_rvsell_a428ca2c.

### R-4. Any price is accepted without a check, and one offer takes over the shared TOTAL VALUE — minor (user expectation, uncertain)
- **Steps:** Create Offer → Field → price `123456789012.34` → Create Offer. Look at the Marketplace header as any user.
- **Expected:** an upper bound or a confirmation for an implausible price. At least, a shared statistic should not be dominated by one listing.
- **Actual:** accepted at once. TOTAL VALUE in every user's header went from 506 752,73 to 123 457 295 737,19. The card shows `123456789012.34 ROL` with no thousands separator, while the header uses `123 457 295 737,19`.
- **Evidence:** `artifacts/review/R5a-R8b-form-cases.jsonl`, `artifacts/review/R5-my-offers-huge-price-and-array-description.png`, `artifacts/review/R12-readback-and-cleanup.json`
- **Env:** Google Chrome 158.0.8127.88, 1280×720, seller qa_rvsell_a428ca2c. Offer 1585, cancelled afterwards.
- **Note:** AC-1 sets only "greater than 0", so this may be intended. Reported as a question for the author.

### R-5. The status dot covers the end of the price on every offer card — cosmetic
- **Steps:** open My Offers (or Browse) at 1366×768.
- **Expected:** the price is fully readable.
- **Actual:** the 12 px status dot in the card's top-right corner sits on the "L" of "ROL" on every card.
- **Evidence:** `artifacts/review/R9-status-dot-over-price.png`, `artifacts/review/R9-status-dot-vs-price.json`, and the tester's `artifacts/U1-my-offers-card.png`
- **Env:** Google Chrome 158.0.8127.88, 1366×768.
