---
title: After the browser's Back button, Browse lists unfiltered offers while the filter box still shows the search
area: ui/marketplace/browse
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer (fresh)

## Steps to reproduce
1. Marketplace → Browse, type a run tag in "Filter offers by any text..."; only the matching offer shows.
2. Open the Financial page from the top navigation.
3. Press the browser's Back button.

## Expected
Browse shows the offers that match the text in the filter box, or the box is empty.

## Actual
The filter box still reads the tag, but Browse lists 9 unfiltered demo offers that do not contain it. Typing any character applies the filter again.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R6-back-from-financial.png`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R3-R6-direct-url-and-back.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R6b-back-repeat.json`

## Frequency
2/2

## Regression check
Filter by a tag, navigate away, go Back: every card in `#browseOffers` must contain the tag.
