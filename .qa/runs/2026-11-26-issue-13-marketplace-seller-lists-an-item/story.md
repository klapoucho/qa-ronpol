Source: https://github.com/klapoucho/qa-ronpol/issues/13 — state OPEN, labels: marketplace, ui, test-case. No linked PR. Read as klapoucho (access: admin).

# Marketplace: seller lists an item (UI)

## User story

As a farmer, I want to list a field I own in the Marketplace, so that other users can buy it.

## Context

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens: browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction history.

## Acceptance criteria

- **AC-1 Create offer.** A logged-in user can offer a field or an animal group they own for a price greater than 0. The description is optional, at most 300 characters, letters (including Polish), digits, `_`, whitespace and `. , ; : ! ( ) -` only. Invalid input is refused with 400 and a message naming the problem. An item the user does not own is refused with 404.
- **AC-3 Visibility.** Browse shows the active offers of other users, not the user's own. My Offers shows the user's own offers.

## Test

- **Level:** UI (Playwright project `ui`, folder `tests/ui/marketplace/`)
- **Scenario:** **Seller lists an item.** User with a field (seeded through the API, logged in through cookies) creates an offer in the UI. Assert the success message and the offer in My Offers; assert through the API that another user can see it.
- **What it shows:** Page objects, API-seeded preconditions, UI action only where the UI matters
- **Done means:** section 11 of the requirements.

## Reference

[Requirements, section 5: first delivery, five tests](https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md#5-first-delivery-five-tests)


## Comments

none
