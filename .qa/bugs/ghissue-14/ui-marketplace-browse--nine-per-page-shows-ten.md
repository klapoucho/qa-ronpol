---
title: "9 per page" shows 10 offers per page once the page size has been changed
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
1. Browse, filtered to 20 offers (shared run tag).
2. Choose 18 per page, then 36, then "9 per page" again.

## Expected
9 cards per page and 3 pages, as on first load.

## Actual
10 cards per page and 2 pages. The option labelled "9 per page" has the value `10`; only the first load uses 9.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U22-U23-paging-filter.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U22-9-per-page-shows-10.png`

## Frequency
always

## Regression check
`#offersPageSize` option with text "9 per page" must have value 9; after switching to 18 and back, page 1 has 9 cards.
