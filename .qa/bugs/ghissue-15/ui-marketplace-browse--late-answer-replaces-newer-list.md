---
title: A late answer from an earlier offers request replaces the newer Browse list
area: ui/marketplace/browse
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; offers call mocked with controlled timing
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (viewer)

## Steps to reproduce
1. Browse Offers loaded.
2. Click the Browse Offers tab, then again 0.3 s later.
3. The first request answers after 3 s (2 offers), the second at once (3 offers).

## Expected
The list from the latest request stays.

## Actual
The newest list (3 offers) shows, then at 3.2 s the older answer (2 offers) replaces it. The user may see an offer that is gone, and Buy Now on it fails. Reached with a double click on the tab, or a tab click during the refetch after a buy/create/cancel, plus a change in between.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R6-stale-answer-overwrites-fresh.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R6-stale-answer-overwrites-fresh.png`

## Frequency
always with that timing (timing-dependent in real use)

## Regression check
Mock two offers answers out of order (older last): the newer list must stay.
