---
title: The description rules show only after submit, and "invalid characters" does not say which character is wrong
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
1. Create Offer → description "Czy kupisz?" (a question mark) → Create Offer. Then a 301-character description.

## Expected
The form says up front what is allowed (or counts characters). A refusal names the character or the allowed set.

## Actual
- "Description contains invalid characters" for a plain question mark, with no hint which character is wrong. Quotes and `/` are refused the same way.
- The length limit shows only at submit ("Description cannot exceed 300 characters."). There is no counter and no `maxlength`.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U6k-description-question.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U6j-description-lt.json`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/U6i-description-301.json`

## Frequency
always

## Regression check
Description "Czy kupisz?" → the message should name `?` or the allowed set.
