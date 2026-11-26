---
title: A Browse filter with no match says "No offers available", the same as an empty marketplace
area: ui/marketplace/browse
severity: cosmetic
kind: ux
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
1. Browse Offers with offers present.
2. Type a filter text nothing matches.

## Expected
A message such as "No offers match your filter".

## Actual
"No offers available" with the store icon, word for word the empty-marketplace state.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M5-filter-no-match.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M5-mock-filter-item-type.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/L1-live-browse.json`

## Frequency
always

## Regression check
Filter for a text nothing matches: the message must differ from the empty-marketplace one.
