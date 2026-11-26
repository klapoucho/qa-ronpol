# Plan — Marketplace: buyer buys an offer (UI) · issue #14

**Run:** 2026-11-26-issue-14-marketplace-buyer-buys-an-offer · **Kind:** ui+api (buyer's UI path; seller side, refusals and histories through the API) · unattended, plan not approved by a human.

## QA summary
- **What it does:** a logged-in user opens Marketplace → Browse Offers, clicks **Buy Now** on another user's active offer, confirms in the "Confirm Purchase" modal; the app calls `POST /api/v1/marketplace/buy { offerId }`, shows a toast, refreshes balance, Browse, My Offers and Transaction History. A buyer whose balance is below the price is refused (400, no overdraft).
- **Affected areas:** `/marketplace.html` (balance line, Browse tab with filter + 9/18/36 paging, confirmation modal, Transaction History tab); `POST /marketplace/buy`, `GET /financial/account`, `GET /marketplace/offers|my-offers|transactions`, `GET /financial/transactions`, `GET /fields`, `GET /animals`. Roles: buyer (fresh user), seller (fresh user), rival buyer, observer. No admin role is involved; the demo accounts are never used.
- **Watch for:** confirm modal that hides before the request (no loading state → double buys), stale Browse after an error, balance float formatting, paging/filter state after the list refreshes, known races (cancel/delete/edit during a buy), field-name HTML on the card, history item names.

Frontend read: `scratch/src/marketplace.js` (fetched from the running app) — the modal confirm runs the action and hides at once; no Escape handler; page-size option "9 per page" has value `10`; after a buy only balance/offers/my-offers/transactions are reloaded (not fields/animals/stats).

## Test data (fresh, API-seeded; `scratch/seed.mjs` → `scratch/seed-state.json`)
Non-round starting balances: seller S1 17.43, S2 12.34, S3 5.55, S4 3.21; buyer B1 40.17, boundary buyers B2 31.31 / B3 31.30, modal buyer B5 88.88, rival B4 50.05, session buyer B6 20.20; observer O 0. Every description carries a run tag so Browse can be filtered to this run's offers.

## Checks
| ID | Check | Source | Negative control |
|---|---|---|---|
| A0 | Story claims vs live API: buy 200 shape, 400 insufficient-funds message, 404 for sold/cancelled, AC-5 surfaces | [FROM STORY] AC-4/AC-5 | each read before the action too |
| U1 | B1 sees S1's offer F1 in Browse (filtered by tag), balance line shows 40.17 ROL | [FROM STORY] | S1's decoy offer F1a also listed (right one picked) |
| U2 | Buy Now on F1 → modal "Confirm Purchase", message names item + price 23.45, buttons Cancel / Buy Now | [FROM STORY] | decoy price 23.54 differs |
| U3 | Confirm → toast, one `POST /buy {offerId:F1}`, balance shows 16.72 ROL without reload, F1 gone from Browse (decoy stays), Transaction History shows the purchase -23.45 | [FROM STORY] T4 scenario | before-values read first; 40.17−23.45 is a float trap (16.720000000000002) |
| U3a | AC-5 via API: buyer 16.72, seller 40.88 (17.43+23.45 float trap), field moved, offer `sold`, same tx in both marketplace histories, buyer expense / seller income `marketplace` 23.45 | [FROM STORY] AC-5 | observer's histories empty; decoy offer still active |
| U4 | Reload: balance + history persist; history item name | [ADDED] state verification | — |
| U5 | Animal group (pig ×2) bought in UI → animal moves, balances | [ADDED] item types (story names fields and animals) | seller keeps its other items |
| U6 | One cent below (B3 31.30, price 31.31) in UI → error toast with API message, balance shown unchanged, offer still in Browse, API snapshot unchanged | [FROM STORY] AC-4 no overdraft | U7 buys the same offer |
| U7 | Exact balance (B2 31.31) buys the same offer in UI → 0 ROL | [ADDED] boundary | pairs with U6 |
| U8–U11 | Modal Cancel / X / click backdrop / Escape → no request, nothing changes | [ADDED] dismissal | U12 confirms the flow still works |
| U12 | Open X, cancel; open Y, confirm → only Y bought | [ADDED] right-one-picked | X still active |
| U13 | Double-click on modal confirm → exactly one POST | [ADDED] double submit | — |
| U14 | Buy Now on the same card again while the first buy (~4 s) is in flight, confirm → what the user sees | [ADDED] loading state / double submit | — |
| U15 | Rival buys the offer while B5's modal is open → confirm → refusal message, nothing charged, Browse state | [ADDED] concurrent other party | rival's buy 200 first |
| U16 | Seller cancels while modal open → confirm → refusal | [ADDED] | — |
| U17 | Buyer's balance drops below price while modal open → confirm → 400, no overdraft; displayed balance | [ADDED] balance change while open | — |
| U18 | Seller edits the listed field while modal open → re-check `put-api-marketplace-offers--item-edited-after-listing` | known bug | — |
| U19 | Seller deletes the field while modal open (before confirm) | [ADDED] | — |
| U20 | Session ended (logout of the same token) while modal open → confirm → login page, nothing moved | [ADDED] in-flight user work | — |
| U21 | Cancel / delete the field during the in-flight UI buy → re-check `delete-api-marketplace-offers--cancel-during-buy-still-sold`, `post-api-marketplace-buy--field-deleted-during-buy` | known bugs | — |
| U22 | Browse paging + filter after a buy: 20 tagged offers, 9/18/36, buy from page 2, filter kept, page counts | [ADDED] story names 9/18/36 | counts before buy |
| U23 | Type filter (Item Type) after a buy | [ADDED] | — |
| U24 | Modal geometry (centred in viewport wider than it), focus | [ADDED] visual | measured |
| U25 | Field-name HTML on the Browse card + buyer's history after purchase | known bug `ui-marketplace-browse--field-name-runs-as-html` | plain-name offer renders as text |
| U26 | Known cosmetic bugs on the buyer's Browse: card heading id, status dot over price, long-word overflow | known bugs | — |
| A1 | Own offer via API → 400; sold offer → 404 | [FROM STORY] AC-4 | — |
| A2 | Logged-out token on buy → refused, nothing moved | [ADDED] api.md | token works before logout |
| A3 | Invalid token → 401 expected (known 403) | known bug | — |
| A4 | Deleted-account token — **not re-run** (memory rule: never delete accounts in parallel runs; known bug evidence cited) | known bug | — |
| A5 | Re-check animals-added-during-buy and seller-assignment-survives-sale via API | known bugs | — |

Order: seed all → UI as B1 (U1–U5, U25/U26 views) → B3/B2 (U6/U7) → B5 (U8–U19, U21, U22/U23) → B6 (U20) → API (A*).
