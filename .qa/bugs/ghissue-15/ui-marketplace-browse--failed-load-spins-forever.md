---
title: When loading the offers fails, Browse shows "Loading offers..." forever; the error is only a toast that disappears after 6 s
area: ui/marketplace/browse
severity: major
kind: functional
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; `GET /api/v1/marketplace/offers` mocked with `page.route`, every other call live
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (viewer)

## Steps to reproduce
1. Log in and open Marketplace (Browse Offers).
2. `GET /api/v1/marketplace/offers` fails: HTTP 500, 502, 400, 404, 429 (the app's own rate-limit body), a network failure, or no answer within 15 s.
3. Wait 7 s, then type any text into the offers filter.

## Expected
A readable error in the list that stays on screen (AC-8), the rest of the page still usable, and a way to retry.

## Actual
The list keeps the spinner and "Loading offers..." for good (checked at 7, 16 and 23 s); pagination and the page-size selector are not rendered. The only error is a red toast with the API's `error` text (e.g. "Failed to get marketplace offers", "Too many requests from this IP, please try again later."), gone after 6 s. Typing in the filter then replaces the spinner with "No offers available", telling the user the marketplace is empty. The page's own "Failed to load offers" state appears only for an HTTP 200 without `data`. Retry only through the Browse Offers tab or a reload; nothing on the page offers it. A 429 needs no crafted input: a Marketplace load makes 11 rate-limited calls without the synthetic token, so about 9 loads per 30 s per IP trigger it.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M7a-mock-500.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M7a-mock-500-after-toast-gone.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8a-mock-502-html.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8b-mock-400.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8c-mock-404.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8d-mock-429.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8g-mock-abort-failed.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8h-mock-abort-connrefused.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8p-mock-hang-no-input.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8o-mock-hang-timeout.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8i-mock-malformed-json-200.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R5-browser-load-rate-limit-headers.json`

## Frequency
always (every failure kind listed)

## Regression check
Mock `GET /api/v1/marketplace/offers` with 500 and open Browse: after 7 s the list must show a lasting error, not "Loading offers...". Test: `tests/ui-mocked/marketplace/` (500 case).

## Hint for developers (optional)
In `api-service.js` the `throw` for 5xx sits inside the same `try` whose `catch` swallows it, and 4xx, network failures and timeouts return `{ success: false }`. `_loadOffers` ignores that value, so its "Failed to load offers" branch never runs.
