---
title: On a 375 px screen the Marketplace tab bar is wider than the screen; "Transaction History" is cut off and the page scrolls sideways
area: ui/marketplace/tabs
severity: minor
kind: ui-consistency
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 375x812 (desktop UA)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller qa_rvsell_a428ca2c (fresh)

## Steps to reproduce
1. set the viewport to 375×812, open Marketplace as a logged-in user, then Create Offer.

## Expected
The four tabs fit or wrap, and the page does not scroll sideways (the home page doesn't).

## Actual
the tab bar ends at 397 px, so "Transaction History" is cut off at the right edge and the page scrolls 22 px sideways. The form itself stacks into one column and works: the offer is created and the card fits.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R8-mobile-375-create-form.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R8-mobile-375-create-form.png`

## Frequency
always

## Regression check
Marketplace at 375x812: the tab bar must end inside the viewport.
