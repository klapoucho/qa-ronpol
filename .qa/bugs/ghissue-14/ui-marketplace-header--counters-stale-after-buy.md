---
title: The Marketplace header counters (Active, Trades) do not change after a purchase until the page is reloaded
area: ui/marketplace/header
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
1. Note the Marketplace header counters.
2. Buy an offer from Browse.

## Expected
"Active" drops by one and "Trades" rises by one.

## Actual
The header still shows 1267 / 208 while `GET /api/v1/financial/marketplace-stats` at the same moment returns 1266 / 209. After a reload it shows 1266 / 209.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U4-reload-and-header.json`

## Frequency
1/1

## Regression check
Buy, then compare the header with `GET /api/v1/financial/marketplace-stats` without reloading.
