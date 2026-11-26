---
title: One failed 5xx offers load shows the same error toast twice
area: ui/marketplace/browse
severity: cosmetic
kind: ux
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; offers call mocked
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (viewer)

## Steps to reproduce
1. Browse Offers with `GET /api/v1/marketplace/offers` answering 500 (or 502).

## Expected
One error toast.

## Actual
Two identical "Error / Failed to get marketplace offers" toasts stacked. 4xx responses show one.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M7b-mock-500-two-toasts.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M7b-mock-500-toasts.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8b-mock-400.json`

## Frequency
always (5xx)

## Regression check
Mock a 500: at most one toast at a time.
