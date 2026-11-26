---
title: When other money operations are queued, the Buy Now confirmation gives up after 15 s with "signal timed out", yet the buyer is charged and the offer is sold
area: api/marketplace/buy
severity: major
kind: functional
status: open
source: "own: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Playwright bundled Chromium (Playwright Test, project `ui`), 4 workers
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: buyer and seller (fresh, funded)

## Steps to reproduce
1. Have several money operations in flight at once (here: 4 parallel copies of a test, each funding two users and buying one offer). Every income and purchase goes through one global ledger lock: ~2.0 s per income, ~4.2 s per purchase with no contention.
2. As a buyer, Browse → Buy Now → Buy Now in "Confirm Purchase" while the queue is long.

## Expected
The buyer gets the real outcome: either the purchase succeeds and the UI says so, or it is refused and nothing is charged.

## Actual
The page aborts the request after 15 s (`POST /api/v1/marketplace/buy` ends with no response after 15011 ms, `net::ERR_FAILED`). The buyer sees the error toast "signal timed out", the balance stays "40.17 ROL" and the offer stays in Browse with Buy Now. The server still completes the purchase 15.1 s after the request: the buyer ends at 16.72 (charged 23.45), the seller at 40.88, and the offer is `sold`. A buyer who trusts the error and retries, or buys elsewhere, is surprised by the charge.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/writer/ui-buy-aborted-after-15s-but-completed.json` (request timing, server transaction 253 at 18:29:16.681Z, balances and offer status afterwards)
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/writer/ui-buy-aborted-after-15s.jpeg` (trace frame at +15.3 s: "signal timed out", balance 40.17, offer still listed)
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/writer/ui-buy-confirmed.jpeg` (frame at the confirm)

## Frequency
3/10 and 7/10 runs of `tests/ui/marketplace/buy-offer.spec.ts --repeat-each=10 --workers=4` with the seller funded; 0/10 at 2 workers.

## Regression check
Queue ~6 incomes through `POST /api/v1/financial/transactions` in parallel, then confirm a purchase in the UI: the toast must match the server's outcome (and the page must not give up while the server is still working).

## Hint for developers (optional)
`api-service.js` uses `AbortSignal.timeout(15000)` for every call, while `helpers/ledger.js` serialises all money operations.
