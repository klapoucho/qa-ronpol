---
title: The "filter by" and "per page" selects on Marketplace Browse have no accessible name
area: ui/marketplace/browse
severity: minor
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
1. Browse Offers.
2. Read the accessibility tree, or move to the controls with a screen reader.

## Expected
Each control is announced with its purpose ("Filter field", "Offers per page").

## Actual
Both selects are a bare "combobox": no `<label>`, `aria-label` or title. The filter text box is named only by its placeholder.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R8-live-browse-a11y-snapshot.yml`

## Frequency
always

## Regression check
Accessibility snapshot of Browse: both comboboxes have a name.
