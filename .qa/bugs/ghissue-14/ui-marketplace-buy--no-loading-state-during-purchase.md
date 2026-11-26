---
title: No progress is shown during the ~4 s purchase, so the buyer can start the same purchase again and sees success followed by an error
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
- Role / account: buyer (fresh, funded)

## Steps to reproduce
1. As a funded buyer, open Marketplace → Browse and click Buy Now on another user's offer.
2. Click Buy Now in "Confirm Purchase".
3. Within the next ~4 s, click the same card's Buy Now again and confirm.

## Expected
While the purchase runs the user sees progress (spinner or disabled button) and cannot start it again.

## Actual
The modal closes at once and for ~4.2 s nothing shows that the purchase is running: the card stays, its Buy Now is enabled, the balance is unchanged. The second confirm sends a second `POST /api/v1/marketplace/buy`. The user sees "Purchase completed successfully!" and 5 ms later "Offer not found or not available". The buyer is charged once.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U14-buy-again-while-first-buy-runs.json`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U14-during-buy-no-feedback.png`
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/U14-after-second-confirm.png`

## Frequency
1/1

## Regression check
Confirm a buy, then screenshot Browse 1 s later: the bought card must be disabled or show progress.
