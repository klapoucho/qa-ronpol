---
title: The Create Offer form refuses any price below 1 ROL, although the rule and the API allow anything above 0
area: ui/marketplace/create
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-12-marketplace-business-rules"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Chromium 1280x720 (playwright-cli)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller, fresh registered user who owns a field

## Steps to reproduce
1. Log in, open Marketplace → Create Offer.
2. Choose Field, pick the field, enter price `0.5`, click Create Offer.

## Expected
Issue #12 AC-1 allows "a price greater than 0", and the API accepts 0.01. The form accepts 0.5 (or the rule says 1).

## Actual
The browser blocks the submit with "Value must be greater than or equal to 1." (`<input type="number" min="1" step="0.01">`). No request is sent and nothing is stored. The form's own JS check says "greater than 0", which contradicts the native message.

## Evidence
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/U1-ui-price-0.5-blocked.png`
- `.qa/runs/2026-11-26-issue-12-marketplace-business-rules/artifacts/review/U1-U3-ui-offers-read-back.json`

## Frequency
always

## Regression check
Create Offer form, price 0.5 → expect the offer to be created with price 0.5.
