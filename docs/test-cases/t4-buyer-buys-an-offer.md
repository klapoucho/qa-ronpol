## User story

As a buyer, I want to buy an offer from Browse and confirm it, so that the item becomes mine and I see the cost in my balance and history.

## Context

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens: browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction history.

## Acceptance criteria

- **AC-4 Buy.** A user can buy another user's active offer when their balance covers the price. No overdraft: a balance below the price is refused with 400 and nothing changes.
- **AC-5 Effects of a sale.** After a purchase: the buyer's balance drops by the price, the seller's rises by the price, the item belongs to the buyer, the offer is no longer active, and the sale appears in both users' marketplace and financial history.

## Test

- **Level:** UI (Playwright project `ui-ledger`, folder `tests/ui/marketplace/`; tagged `@ledger`, so it runs alone, D-19)
- **Scenario:** **Buyer buys an offer.** Offer seeded through the API; funded buyer buys it in Browse and confirms in the modal. Assert the balance shown, the offer gone from Browse, the entry in transaction history.
- **What it shows:** Full user path on the real backend
- **Done means:** section 11 of the requirements.

## Reference

[Requirements, section 5: first delivery, five tests](https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md#5-first-delivery-five-tests)
