---
title: The status dot covers the end of the price ("ROL") on every offer card
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
- Role / account: seller (fresh)

## Steps to reproduce
1. open My Offers (or Browse) at 1366×768.

## Expected
The price is fully readable.

## Actual
the 12 px status dot in the card's top-right corner sits on the "L" of "ROL" on every card.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R9-status-dot-over-price.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R9-status-dot-vs-price.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U1-my-offers-card.png`

## Frequency
always

## Regression check
My Offers at 1366x768: the dot's box must not intersect the price text box.
