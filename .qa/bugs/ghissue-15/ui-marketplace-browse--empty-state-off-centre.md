---
title: The Browse empty and error states sit in the first card column instead of the middle of the list
area: ui/marketplace/browse
severity: cosmetic
kind: ui-consistency
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (viewer)

## Steps to reproduce
1. Browse Offers with no offers (or a filter with no match, or the error state) at 1366x768.

## Expected
The message is centred in the list, like Transaction History's empty state on the same page.

## Actual
The message box is one grid column wide (373 px at left 103); its text is centred at x=290 while the 1160 px list is centred at x=683. Transaction History's empty state is centred (683 vs 683).

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M6-mock-empty.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/V2-mock-empty-state-geometry.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/V2-live-transactions-empty-state-geometry.txt`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/V2-live-transactions-empty-state.png`

## Frequency
always

## Regression check
Mock `offers: []`: the empty-state text centre must match the list centre within a few px.
