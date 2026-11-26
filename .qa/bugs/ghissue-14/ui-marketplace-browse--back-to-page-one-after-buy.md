---
title: After a purchase Browse jumps back to page 1
area: ui/marketplace/browse
severity: minor
kind: ux
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
1. Browse filtered to 20 offers, 18 per page.
2. Go to page 2 and buy an offer there.

## Expected
The buyer stays on page 2 (or near the bought offer).

## Actual
Filter and page size are kept (19 results, 2 pages), but the view returns to page 1.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U22-U23-paging-filter.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U22-after-buy-back-on-page1.png`

## Frequency
1/1

## Regression check
Buy from page 2: the active page button must still be 2.
