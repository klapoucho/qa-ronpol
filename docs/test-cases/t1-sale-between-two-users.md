## User story

As a seller, I want a funded buyer to buy my listed field, so that I receive the price in ROL and the buyer owns the field.

## Context

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens: browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction history.

## Acceptance criteria

- **AC-4 Buy.** A user can buy another user's active offer when their balance covers the price. No overdraft: a balance below the price is refused with 400 and nothing changes.
- **AC-5 Effects of a sale.** After a purchase: the buyer's balance drops by the price, the seller's rises by the price, the item belongs to the buyer, the offer is no longer active, and the sale appears in both users' marketplace and financial history.

## Test

- **Level:** API (Playwright project `api`, folder `tests/api/marketplace/`)
- **Scenario:** **Sale between two users.** Seller with a field lists it; funded buyer buys it. Assert both balances, the field's new owner, the offer status, and the history of both users.
- **What it shows:** Two actors, cross-domain checks (marketplace, finance, fields), factories and API clients
- **Done means:** section 11 of the requirements.

## Reference

[Requirements, section 5: first delivery, five tests](https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md#5-first-delivery-five-tests)
