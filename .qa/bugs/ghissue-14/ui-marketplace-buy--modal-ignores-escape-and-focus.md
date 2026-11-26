---
title: The purchase confirmation ignores Escape, leaves keyboard focus behind the overlay and is not announced as a dialog
area: ui/marketplace/buy
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer (fresh)

## Steps to reproduce
1. Browse → Buy Now on another user's offer.
2. Press Escape; then press Tab twice.

## Expected
Escape closes the modal; focus moves into the modal and stays there; the modal has `role="dialog"` and `aria-modal`.

## Actual
The modal stays open. Focus stays on the card's Buy Now behind the overlay and Tab moves to the pagination buttons behind it. The modal has no `role="dialog"` and no `aria-modal`. Cancel, × and a backdrop click do close it without a request.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U8-U11-modal-dismissals.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U11-escape-modal-still-open.png`

## Frequency
always

## Regression check
Open the modal, press Escape: `getByTestId('confirmation-modal')` must be hidden.
