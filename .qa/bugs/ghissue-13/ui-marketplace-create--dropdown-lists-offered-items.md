---
title: The Create Offer item dropdown still offers items that already have an active offer
area: ui/marketplace/create
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1366x768
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller (fresh account)

## Steps to reproduce
1. list fields from the form or the API, reload Marketplace, open Create Offer → Field.

## Expected
Items with an active offer are left out or marked, like fields with animals, which are already left out.

## Actual
- All 9 of the seller's listed fields are still offered after a fresh page load, and so is the listed animal group.
- Picking one gives "Item is already offered for sale" only after submit (U4; the form keeps its input).
- The list is also loaded only once per page load, so a field deleted meanwhile stays selectable and gives "Item not found or not owned by user" (U5).

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U3c-dropdown-lists-already-offered-items.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U3c-dropdown-open.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U4-already-offered-form-state.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U4-already-offered-error.png`

## Frequency
always

## Regression check
List a field through the API, reload Marketplace, open Create Offer → Field: the listed field should be left out or marked.
