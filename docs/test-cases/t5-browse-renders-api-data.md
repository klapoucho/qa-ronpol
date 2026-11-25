## User story

As a user browsing the Marketplace, I want offers, pages, an empty list and API errors shown clearly, so that I always know what is on offer.

## Context

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens: browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction history.

## Acceptance criteria

- **AC-3 Visibility.** Browse shows the active offers of other users, not the user's own. My Offers shows the user's own offers.
- **AC-8 Browse states.** The browse list paginates and filters by item type, shows an empty state when there are no offers, and shows a readable error when the API fails, without breaking the page. (Empty and error behaviour is not confirmed yet; the first `qa-pick` run establishes it.)

## Test

- **Level:** UI on mocks (Playwright project `ui-mocked`, folder `tests/ui-mocked/marketplace/`)
- **Scenario:** **Browse renders API data (parametrized).** Mocked API returns: a page of offers, several pages, no offers, a 500 error. Assert cards (type, price, seller, item details), pagination, the empty state, the error message.
- **What it shows:** Frontend logic without a backend, deterministic data, mock layer and network guard
- **Done means:** section 11 of the requirements.

## Reference

[Requirements, section 5: first delivery, five tests](https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md#5-first-delivery-five-tests)
