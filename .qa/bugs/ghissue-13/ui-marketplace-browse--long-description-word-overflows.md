---
title: One long word in an offer description stretches every buyer's Marketplace page sideways
area: ui/marketplace/browse
severity: minor
kind: ui-consistency
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and another user (fresh accounts)

## Steps to reproduce
1. list a field with a valid 300-letter description without spaces (allowed characters only, here 300 Polish letters). Open My Offers, or open Browse as another user and filter to the offer.

## Expected
The text wraps inside the card.

## Actual
- The description runs about 2,100 px out of its 373 px card, over the neighbouring cards.
- The page gets a horizontal scrollbar: document width 2,583 px in a 1,366 px viewport.
- The card has `overflow-wrap: normal; word-break: normal`.
- Descriptions with spaces wrap correctly (U1).

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U14-long-word-description-overflow.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U14-long-word-description-overflow.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U14b-observer-browse-long-word-overflow.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U14b-observer-browse-long-word-overflow.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U11-my-offers-many-states.png`

## Frequency
always (2/2 pages)

## Regression check
List a field with a 300-letter description without spaces; open Browse as another user, filter to it: the page must not scroll sideways (document width = viewport).

## Hint for developers (optional)
Let long words break inside the card (`overflow-wrap: anywhere`).
