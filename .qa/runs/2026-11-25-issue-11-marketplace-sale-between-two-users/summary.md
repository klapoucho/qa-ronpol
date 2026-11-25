# Summary — Marketplace: sale between two users (API)

**Verdict: FAIL** · **Reviewer:** GAPS CLOSED (recommended FAIL) · **Run:** 2026-11-25-issue-11-marketplace-sale-between-two-users · **Source:** https://github.com/klapoucho/qa-ronpol/issues/11 (no linked PR)
**Env:** http://localhost:3000/api/v1 · Rolnopol 1.126.0 (Docker) · API via Node fetch scripts · 2026-11-25
**Roles covered:** seller, buyer, third user, stranger, former owner, anonymous · **Skipped:** admin (not in the buy flow), demo accounts (forbidden)
**Automation:** done — branch `test/api-marketplace-sale`, `tests/api/marketplace/sale.spec.ts` (T1); 10/10 stable, 4 poison runs failed as intended; PR https://github.com/klapoucho/qa-ronpol/pull/18

On the normal path AC-4 and AC-5 hold for fields and animals: the price, the item, the offer status and both histories move exactly, refusals change nothing, and concurrent buys produce one sale. The run fails on what a seller can do around a listing.

## Problems

| # | Severity | Problem | Bug file | Evidence |
|---|---|---|---|---|
| R-1 | major | Seller deletes the field while a buy runs → buyer charged, no field (5/6) | `.qa/bugs/api-marketplace-buy--field-deleted-during-buy.md` | `artifacts/review/E5-…round1.json`, `…round2.json` |
| R-2 | major | Listed field/animal can be edited; buyer pays the listed price for the edited item | `.qa/bugs/api-marketplace-offers--item-edited-after-listing.md` | `artifacts/review/E4-item-edited-after-listing.json` |
| R-3 | major | Any user can attach animals/staff to another user's field, blocking its sale | `.qa/bugs/api-fields-ownership--non-owner-attaches-animals-and-staff.md` | `artifacts/review/E3b-…json` |
| R-4 | major | Non-owner `DELETE /fields/:id` → 200 and wipes the owner's staff assignments | `.qa/bugs/api-fields-ownership--non-owner-delete-wipes-assignments.md` | `artifacts/review/E3c-…json` |
| 1 | minor | Create offer → HTTP 200 with `"message": 201` instead of 201 | `.qa/bugs/api-marketplace-offers--create-offer-status-in-message.md` | `artifacts/01-happy-buy-response.json` |
| 2 | minor | Malformed JSON → 500 instead of 400 (app-wide) | `.qa/bugs/api-app-input--malformed-json-500.md` | `artifacts/15b-…json` |
| 3 | minor | `offerId` as a string → 404 for an active offer | `.qa/bugs/api-marketplace-buy--string-offer-id-404.md` | `artifacts/15-invalid-offer-ids.json` |
| 4 | minor | Invalid token → 403 instead of 401 | `.qa/bugs/api-auth-token--invalid-token-403.md` | `artifacts/16-buy-without-auth.json` |
| R-5 | minor | Seller adds animals during a buy → buyer gets an encumbered field | `.qa/bugs/api-marketplace-buy--animals-added-during-buy.md` | `artifacts/review/E6-…json` |
| R-6 | minor | Cancel during a buy says "cancelled", the offer is sold anyway | `.qa/bugs/api-marketplace-offers--cancel-during-buy-still-sold.md` | `artifacts/review/E7-…json` |
| R-7 | minor | Seller's staff assignment stays on the buyer's field after a sale | `.qa/bugs/api-marketplace-buy--seller-assignment-survives-sale.md` | `artifacts/review/E3-…json` |
| 5 | cosmetic | `offerId: 0` → "Missing required field" | `.qa/bugs/api-marketplace-buy--offer-id-zero-message.md` | `artifacts/15-invalid-offer-ids.json` |
| 6 | cosmetic | OpenAPI shape of the marketplace history is wrong | `.qa/bugs/api-marketplace-docs--openapi-history-shape.md` | `artifacts/05-happy-marketplace-history.json` |

Full steps, expected and actual for each: `report.md`.

## Test cases (R = reviewer experiment)

| # | Result | Case |
|---|---|---|
| 1–6 | PASS | Field sale at 123.45: transaction, exact balances, field owner, offer `sold`, both marketplace and financial histories |
| 7, 8, 9, 10 | PASS | Balance = price → bought; one cent below, zero, 3-decimal price → refused, nothing changes |
| 11, 12, 17, 19 | PASS | Own offer, sold offer, cancelled offer, deleted field → refused, nothing changes |
| 13, 14 | PASS | Concurrent buys (two buyers, same buyer): exactly one sale, 4 races |
| 15, 16 | PASS | Unknown/missing/negative id, no token → 4xx, nothing changes |
| 18 | PASS | After a sale only the buyer can relist the field |
| 15a, 15b, 16a, 21 | FAIL | Problems 1–5 |
| R1, R2, R10 | PASS | Animal sale end to end; animal moved onto a field before the buy; buyer spends the balance during a buy |
| R3–R9 | FAIL | Problems R-1 to R-7 |

## Reviewer's coverage verdict
GAPS CLOSED. The tester's evidence and negative controls held up. The gaps were animals, the seller acting on a listed item (before and during a buy), and the former owner's access after the sale. The reviewer closed all of them, and they produced R-1 to R-7.

## Not verified
- Expired but validly signed token (cannot be signed without the app's secret).
- Whether the Fields and Animals screens allow editing a listed item (R-2 is API-only); the UI side of a sale is T4.

## Agents
- QA tester (background subagent, Opus): API exploratory run, about 10 min. Its write of `report.md` was refused by the harness, so the coordinator saved it from the final message.
- QA reviewer (background subagent, Opus, fresh context): about 8 min of its 1.5 h time-box.
- Test writer (background subagent, Opus, own worktree): T1 plus the clients, models, factories and fixtures it needs; resumed once with the test review's fixes.
- Test reviewer (background subagent, Opus, fresh context, read-only): 6 fixes, 7 decision points (5 go to the PR, 2 settled: the poison and stability evidence is in the intent card, and register does create the financial account).

## Lessons applied (branch `docs/qa-lessons-issue-11`, PR https://github.com/klapoucho/qa-ronpol/pull/19)
- Tester prompt: transfer/ownership stories cover every item type, and what the previous owner and other users can do before, during and after the transfer.
- "Changed by" assertions start every actor at a non-zero, non-round value (`testing-rules/general.md`, tester prompt).
- QA settings install command runs `nvm use` first (`CLAUDE.md`); also saved to memory.
