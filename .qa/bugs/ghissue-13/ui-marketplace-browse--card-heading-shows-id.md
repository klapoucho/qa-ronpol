---
title: The offer card heading shows "field #id" / "animal #id" instead of the item name, and typed line breaks are joined
area: ui/marketplace/browse
severity: cosmetic
kind: ui-consistency
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller and another user (fresh)

## Steps to reproduce
1. Open Browse or My Offers with at least one offer.

## Expected
The heading shows the item name (as in the "Field: …" line), and line breaks typed in the description are kept.

## Actual
- Other users see `field #1602` as the card heading. The name only appears in the "Field: …" line below.
- The seller's animal card is headed `animal #1463`.
- Line breaks typed in the description are joined into one paragraph: 13 newlines rendered as 6 wrapped lines, `white-space: normal`.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U12b-observer-browse-card.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U2-my-offers-dom.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U2-my-offers-animal-card.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U14-long-word-description-overflow.json`

## Frequency
always

## Regression check
Any offer card in Browse or My Offers: the heading should show the item name.
