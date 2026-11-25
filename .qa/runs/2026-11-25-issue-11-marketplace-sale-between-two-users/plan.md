# Plan — Marketplace: sale between two users (API)

**Run:** 2026-11-25-issue-11-marketplace-sale-between-two-users · **Kind:** API · **Env:** http://localhost:3000 (Rolnopol 1.126.0, Docker image `jaktestowac/rolnopol:1.126.0`)
**Mode:** unattended — plan written and executed without approval stop.

## QA summary

**What it does.** A user (buyer) with enough ROL buys another user's active Marketplace offer (here: a field). The price moves from buyer to seller, the field changes owner, the offer becomes `sold`, and both users see the sale in their marketplace history and financial history. A buyer whose balance is below the price is refused (400) and nothing changes.

**Affected areas (API).**
- `POST /api/v1/marketplace/buy` `{ offerId }` — the action under test.
- Read-backs for AC-5: `GET /financial/account` (balance + embedded transactions), `GET /financial/transactions`, `GET /marketplace/transactions`, `GET /fields`, `GET /marketplace/my-offers` (offer status), `GET /marketplace/offers` (browse).
- Seeding: `POST /register`, `POST /financial/transactions` (income needs a Luhn-valid card + CVV), `POST /fields`, `POST /marketplace/offers`.
- Roles: authenticated user as seller, as buyer, as a third user (bystander); anonymous caller. No admin role in scope.

**Watch for (from source in the container, `services/marketplace.service.js`).**
- `buyItem` looks the offer up with strict `o.id === offerId` → an `offerId` sent as a string may not match.
- Money moves first, then ownership, then the offer/transaction write; a failure in between has compensating reversals.
- `withLedgerLock` serialises buys → concurrent buys of one offer should yield exactly one sale.
- Balance check `buyerBalance < offer.price` and a second overdraft check in `financialService.addTransaction`.
- Create offer returns HTTP 200 with `"message": 201` in the body (seen in discovery) — neighbour, affects seeding code.

## Test data

Fresh users per check through `POST /register` (displayed name ≤ 20 chars), funded through `POST /financial/transactions` (type `income`, published Visa test card number, CVV `123`). Fields through `POST /fields` `{ name, area }`. Never the demo accounts. Scripts and seed state in `scratch/` (`lib.mjs`, `seed-state.json`).

## Checks

Markers: `[FROM STORY]` from AC-4/AC-5, `[ADDED]` added by challenge (requirement named or **assumption**). Every refusal check reads back **both balances, the field owner (both `/fields`), the offer status (seller `my-offers`), both marketplace histories and both financial histories** before and after, and compares them.

| # | Check | Marker | Requirement | Negative control |
|---|---|---|---|---|
| 1 | Happy path: seller (unfunded, balance 0) lists a field at a decimal price (123.45); buyer funded 200 buys it → 200, transaction body (offerId, sellerId, buyerId, itemType, itemId, price, status `completed`) | [FROM STORY] | AC-4 | — (positive) |
| 2 | Buyer balance = 200 − 123.45 = 76.55; seller balance = 0 + 123.45 | [FROM STORY] | AC-5 | exact values, not "changed"; a half-done payment (only one side) fails it |
| 3 | Field belongs to buyer: in buyer `GET /fields` with same name/area, gone from seller `GET /fields` | [FROM STORY] | AC-5 | seller list must NOT contain it |
| 4 | Offer no longer active: status `sold` in seller `my-offers`; absent from browse of the buyer and of a third user | [FROM STORY] | AC-5 | third user saw it in browse **before** the sale |
| 5 | Marketplace history: the same transaction (same id) in buyer and seller `GET /marketplace/transactions`; absent from a third user's | [FROM STORY] | AC-5 | third user's history must not show it |
| 6 | Financial history: buyer has expense 123.45 category `marketplace`; seller income 123.45 category `marketplace`; in both `/financial/transactions` and `/financial/account.transactions` | [FROM STORY] | AC-5 | buyer must not get an income, seller not an expense |
| 7 | Boundary: balance exactly = price → 200; buyer ends at 0 | [ADDED] | AC-4 ("covers the price") | — |
| 8 | Boundary: balance = price − 0.01 → 400 overdraft message; nothing changes | [ADDED] | AC-4 | full state diff before/after |
| 9 | Boundary: balance 0 → 400; nothing changes | [ADDED] | AC-4 | full state diff |
| 10 | Decimal handling: offer price with 3 decimals (10.555) is stored rounded; a buyer with exactly the stored price can buy | [ADDED] | assumption (2-decimal money, `roundMoney`) | buyer with stored price − 0.01 refused |
| 11 | Buy own offer → 400 "Cannot buy your own offer"; nothing changes | [ADDED] | AC-6 | seller is funded (refusal not explained by funds) |
| 12 | Buy a sold offer again: same buyer and another funded buyer → 404; no second debit/credit | [ADDED] | AC-4 ("active offer") | balances re-read |
| 13 | Two concurrent buys of one offer by two funded buyers → exactly one 200; one sale, one debit, one credit | [ADDED] | AC-4/AC-5 | both buyers funded enough |
| 14 | Same buyer sends two concurrent buys (double click) → one 200, one 404; debited once | [ADDED] | AC-4 | — |
| 15 | Non-existent offer id → 404; missing `offerId` → 400; `offerId` as numeric string → behaviour recorded | [ADDED] | assumption (status per `api.md`) | user is otherwise valid (reads own account) |
| 16 | No auth → 401; malformed token → 401; nothing changes | [ADDED] | assumption (`api.md`) | same request with a valid token succeeds elsewhere |
| 17 | Cancelled offer cannot be bought → 404 | [ADDED] | AC-7 | — |
| 18 | User expectation: buyer can list the bought field again; seller can no longer list it (404) | [ADDED] | AC-1 + AC-5 (ownership is real) | — |
| 19 | User expectation: seller deletes the listed field, then buyer buys → refused, nothing paid | [ADDED] | assumption | balances re-read |

Order: one seed per check (fresh pair of users), executed by scripts in `scratch/`; one artifact JSON per check.
