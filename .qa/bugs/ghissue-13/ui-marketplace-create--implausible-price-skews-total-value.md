---
title: Any price is accepted without a check, and one offer takes over the shared TOTAL VALUE header
area: ui/marketplace/create
severity: minor
kind: ux
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1280x720
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller qa_rvsell_a428ca2c (fresh)

## Steps to reproduce
1. Create Offer → Field → price `123456789012.34` → Create Offer. Look at the Marketplace header as any user.

## Expected
An upper bound or a confirmation for an implausible price. At least, a shared statistic should not be dominated by one listing.

## Actual
accepted at once. TOTAL VALUE in every user's header went from 506 752,73 to 123 457 295 737,19. The card shows `123456789012.34 ROL` with no thousands separator, while the header uses `123 457 295 737,19`.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R5a-R8b-form-cases.jsonl`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R5-my-offers-huge-price-and-array-description.png`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R12-readback-and-cleanup.json`

## Frequency
always

## Regression check
Create Offer with price 123456789012.34: watch TOTAL VALUE; cancel the offer afterwards.
