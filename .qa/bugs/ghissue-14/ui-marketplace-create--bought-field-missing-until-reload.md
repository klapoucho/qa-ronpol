---
title: A field bought a moment ago is missing from Create Offer until the page is reloaded, so the buyer cannot resell it
area: ui/marketplace/create
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
1. Buy another user's field offer in Browse (Buy Now → Buy Now).
2. Without reloading, open Create Offer and choose Item Type "field" (or switch the type away and back).

## Expected
The field just bought is in the item list (the API's `/fields` already returns it).

## Actual
The list shows the buyer's earlier fields but not the one just bought. After a reload it is listed.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R10-create-offer-dropdown-after-buy.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/review/R10-create-offer-after-buy-no-reload.png`

## Frequency
1/1

## Regression check
Buy a field, then open Create Offer without reloading: the field id must be an option.
