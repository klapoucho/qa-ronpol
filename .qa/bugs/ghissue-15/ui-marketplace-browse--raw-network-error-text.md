---
title: Browse error toasts show raw technical text for network problems ("Failed to fetch", "signal timed out", "Invalid JSON response")
area: ui/marketplace/browse
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768; live with the browser offline, and mocked failures
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (viewer)

## Steps to reproduce
1. Browse Offers while the offers request fails at network level (browser offline, aborted request), takes longer than 15 s, or a proxy answers 502 with HTML.

## Expected
A message the user understands (e.g. "Could not load offers. Check your connection and try again.").

## Actual
Network failure → "Failed to fetch"; timeout → "signal timed out" after about 15 s; 502 with an HTML body → "Invalid JSON response".

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8q-live-offline-browse-tab.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8g-mock-network-abort.png`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8p-mock-hang-no-input.json`
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/M8a-mock-502-html.json`

## Frequency
always

## Regression check
Set the browser offline and click Browse Offers: the toast must not say "Failed to fetch".
