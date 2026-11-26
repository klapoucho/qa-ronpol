Source: https://github.com/klapoucho/qa-ronpol/issues/12 — state OPEN; labels: marketplace, api, test-case. No linked PR (closedByPullRequestsReferences empty; body search in klapoucho/qa-ronpol and jaktestowac/rolnopol found no PR naming this issue). Read as `klapoucho` (access: admin).

# Marketplace: business rules for offers and purchases (API)

## User story

As a Marketplace user, I want invalid offers and purchases refused with a clear message, so that nobody loses money or items by mistake.

## Context

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens: browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction history.

## Acceptance criteria

- **AC-1 Create offer.** A logged-in user can offer a field or an animal group they own for a price greater than 0. The description is optional, at most 300 characters, letters (including Polish), digits, `_`, whitespace and `. , ; : ! ( ) -` only. Invalid input is refused with 400 and a message naming the problem. An item the user does not own is refused with 404.
- **AC-2 One active offer per item.** An item that already has an active offer cannot be offered again (400).
- **AC-4 Buy.** A user can buy another user's active offer when their balance covers the price. No overdraft: a balance below the price is refused with 400 and nothing changes.
- **AC-6 Own offer.** A user cannot buy their own offer (400).
- **AC-7 Cancel.** Only the seller can cancel an active offer. Another user gets 403. A cancelled offer disappears from browse and cannot be bought.

## Test

- **Level:** API (Playwright project `api`, folder `tests/api/marketplace/`)
- **Scenario:** **Business rules (parametrized).** Invalid price, invalid or too long description, item already offered, item not owned, own offer, insufficient funds, cancelling another user's offer. Each case asserts status, message and that balances and offers did not change.
- **What it shows:** Data-driven tests, negative paths, state checks after refusals
- **Done means:** section 11 of the requirements.

## Reference

[Requirements, section 5: first delivery, five tests](https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md#5-first-delivery-five-tests)


## Comments

None.
