# QA review — Marketplace: sale between two users (API)

**Run:** 2026-11-25-issue-11-marketplace-sale-between-two-users · **Reviewer date:** 2026-11-25 · **Env:** http://localhost:3000/api/v1 (Rolnopol 1.126.0, Docker) · **Tool:** Node fetch scripts (`scratch/review/`), fresh accounts per experiment · **Evidence:** `artifacts/review/`

## 1. Verdict

**GAPS CLOSED.** I closed every coverage gap myself. Closing them broke the feature:

- AC-5 ("the item belongs to the buyer") fails in a reachable race. If the seller deletes the listed field while a buy is in flight, the buyer pays and gets nothing. This reproduced in 5 of 6 tries (problem R-1).
- A seller can change a listed item after listing, so the buyer pays for something else (problem R-2).

I recommend that the run's status moves from PASS WITH FINDINGS to **FAIL**. The tester's own checks are sound and well evidenced. These failures come from paths the plan did not attack: the seller acting during or after the listing, and animals.

## 2. Coverage checklist

| Point | Result | Note |
|---|---|---|
| Scope: AC-4 | OK | Covers equal balance, one cent below, zero, decimal price, own offer, sold or cancelled offer, and races between buyers. |
| Scope: AC-5 | GAP → closed | The run tested fields only. The story's context says users sell "fields and animals", and no animal sale was run. Closed by E1 and E2. |
| Scope: user expectation (the item bought is the item listed, and is really the buyer's) | GAP → closed | Untested: the seller editing, deleting or encumbering the item while it is listed or while a buy is in flight, and the former owner's leftover access after the sale. Closed by E3 to E7. |
| Scope: "failure in the middle of a purchase" | GAP → closed | The report says this "cannot be triggered from the API". It can: delete the field during the ~4 s buy (E5). The compensation does not fire, because the ownership transfer quietly does nothing when the field is gone. |
| Roles | OK | Seller, buyer, third user and anonymous caller were all covered. Admin was rightly skipped. The UI side of the gates belongs to T4, and this story is API-level. |
| Evidence | OK | I opened artifacts 02, 03, 05, 06 and 08: each shows the claimed before and after state. The checksum check found no duplicate files. |
| Negative controls | OK | Refusals were diffed across 12 read-back surfaces. The happy path used an unfunded seller, a decimal price and a non-zero remainder. The third user's history was checked to be empty. |
| Input → output | OK | Every result was read back through `/financial/account`, `/financial/transactions`, `/marketplace/transactions`, `/fields`, `my-offers` and browse. |
| Data | OK | Browse contains the demo offers, and the run asserted on its own offer id. Paging belongs to the UI (T4). |
| Regressions | OK | `.qa/bugs/` is empty. |
| Tool traps | OK | Bodies were read back, not just status codes. Required fields were found from the OpenAPI spec and the source, not guessed. There is no console in an API run. |
| Report | OK | Every problem has steps, expected, actual and evidence. Severities match reachability: crafted input is minor. |

## 3. Experiments

Rounds 1 and 2 of the races ran about one minute apart. They used the same script against fresh accounts.

| # | Charter | Hypothesis | Result | Evidence |
|---|---|---|---|---|
| E1 | Animal sale end to end: AC-5 for the second item type | The animal moves (same id, type, amount), both balances move by 40.50, the offer is `sold`, both histories show it, a third user's history stays empty, and the stats count it | HELD | `artifacts/review/E1-animal-sale.json` (cow ×3: buyer 100 → 59.5, seller 0 → 40.5. `marketplace-stats`: transactions +1, volume +40.5) |
| E2 | Listed animal moved onto a field before the buy | The buy is refused and nothing is paid | HELD (404, the offer becomes `unavailable`, buyer keeps 100) | `artifacts/review/E2-animal-moved-to-field.json` |
| E3 | Field with the seller's staff assigned is sold | Assignments are cleared or moved with the sale | BROKE: the seller still sees their staff assigned to the buyer's field. The buyer does not see it | `artifacts/review/E3-staff-assignment-and-seller-access.json`, `E3b-…json` steps 4–5 |
| E3b | Former owner and a stranger write to the bought field | Only the owner can attach animals or staff (controls: `PUT /fields/:id` by a non-owner → 404, and the buyer can list a clean field) | BROKE: non-owners get 201 on `POST /animals {fieldId}` and on `POST /fields/assign`. The buyer then cannot list their own field | `artifacts/review/E3b-non-owner-writes-to-bought-field.json` |
| E3c | A stranger calls `DELETE /fields/:id` on another user's field | 403 or 404, and nothing changes | BROKE: 200 "field deleted". The field stays, but the owner's staff assignments on it are wiped. A non-existent id also gets 200 | `artifacts/review/E3c-stranger-deletes-owner-field.json`, `E3b-…json` (the buyer's own assignment removed by the former owner) |
| E4 | Item edited after listing (bait and switch) | Editing is blocked, or the offer is withdrawn, as already happens when an item goes "in use" | BROKE: a field listed at 100 ha and edited to 0.01 ha sells at the original price. "Ten cows" edited to 1 rat sells too | `artifacts/review/E4-item-edited-after-listing.json` |
| E5 | Seller deletes the listed field while a buy is in flight (300, 1500 and 3000 ms in) | The buy is refused or refunded | BROKE 5/6: buyer charged 60, seller paid 60, offer `sold`, transaction `completed`, buyer has no field. In the one held try (round 1, 3000 ms), the delete landed before the buy took the lock: 404, nothing paid | `artifacts/review/E5-race-delete-field-during-buy-round1.json`, `…-round2.json` |
| E6 | Seller puts an animal onto the field while a buy is in flight | The buy is refused (the rule is "cannot sell field with assigned animals") | BROKE: the sale completes and the buyer gets a field holding the seller's 4 sheep. The buyer cannot relist it (400) | `artifacts/review/E6-race-animal-on-field-during-buy.json` |
| E7 | Seller cancels the offer while a buy is in flight | Either the cancel fails, or the buy fails | BROKE 2/2: the cancel answers 200 "Offer cancelled successfully", the sale still completes, and the offer ends `sold` | `artifacts/review/E7-race-cancel-during-buy-round1.json`, `…-round2.json` |
| E8 | Buyer spends the same balance during the buy (funded 100, buy 80 and an expense of 50 at once) | One succeeds and the other is refused, with no overdraft | HELD: buy 200, expense 400 "overdraft is not allowed", balance 20 | `artifacts/review/E8-race-spend-during-buy.json` |

Positive controls on the same paths: the same scripts complete normal buys (E1, E3b "B buys F", E8). `PUT /fields/:id` by a non-owner is refused with 404 (E3b), which shows the token and id handling in my scripts is right. The buyer lists a clean field of their own successfully (E3b, field G).

Totals: 10 experiments: 3 held, 7 broke.

## 4. New problems

Environment for all of them: http://localhost:3000/api/v1, Rolnopol 1.126.0 (Docker), Node 18 fetch with `X-Synthetic-Token`. Every user was freshly registered; account ids are in the artifacts. Date: 2026-11-25.

### R-1. Buyer pays and receives nothing when the seller deletes the field during the purchase — major
- **Steps:**
  1. Seller registers, creates a field and lists it at 60.
  2. Buyer is funded with 100 and calls `POST /marketplace/buy { offerId }`.
  3. Within the next ~4 s, while the buy is still running, the seller calls `DELETE /fields/<id>`.
  4. Read back the buyer's `/fields`, `/financial/account`, `/marketplace/transactions` and the seller's `my-offers`.
- **Expected:** the buy is refused (404 "Item no longer available") with nothing charged, or the payment is reversed.
- **Actual:**
  - The buy answers 200 "Purchase completed successfully" and the delete answers 200.
  - Buyer balance 100 → 40, with an expense of 60 "Marketplace purchase". Seller balance 0 → 60.
  - The offer is `sold` and the marketplace transaction is `completed` with `itemId` of the deleted field.
  - The buyer's `/fields` is empty.
- **Frequency:** 5 of 6 tries, with the delete 0.3, 1.5 or 3 s into the buy.
- **Evidence:** `artifacts/review/E5-race-delete-field-during-buy-round1.json`, `artifacts/review/E5-race-delete-field-during-buy-round2.json`
- **Severity note:** money is lost with nothing delivered. Both steps are ordinary seller and buyer actions; only the timing has to line up, and a buy takes ~4 s.
- **Hint (optional):** `_transferItemOwnership` does nothing when the field is missing, so the compensating reversal never runs. Field deletion does not take the ledger lock.

### R-2. A listed field or animal can be edited after listing; the buyer pays the listed price for the edited item — major
- **Steps:**
  1. Seller creates a field `{ area: 100 }` and lists it at 99 with the description "Big field 100 ha".
  2. Seller calls `PUT /fields/<id> { area: 0.01 }`, which answers 200.
  3. Buyer buys the offer.
  4. Same for animals: list `{ type: cow, amount: 10 }` at 50 as "Ten cows", then `PUT /animals/<id> { type: rat, amount: 1 }`, then buy.
- **Expected:** a listed item is locked, or the offer is withdrawn when the item changes. The app already marks an offer `unavailable` when its item goes "in use".
- **Actual:**
  - Both buys succeed at the original price. The buyer receives a 0.01 ha field for 99, and 1 rat for 50 where 10 cows were listed.
  - The offer description still says "Big field 100 ha" and "Ten cows".
  - Browse shows the new details only to someone who reloads after the edit.
- **Evidence:** `artifacts/review/E4-item-edited-after-listing.json`
- **Env/role:** seller and buyer. Reproduced over the API. I did not check whether the Fields and Animals screens allow the edit while an offer is active.

### R-3. Any user can attach animals and staff to another user's field, and so block its sale — major
- **Steps:**
  1. User B owns field F; here B bought it, but any field works.
  2. User T (a stranger) or S (the former owner) calls `POST /animals { type: "rat", amount: 1, fieldId: F }`.
  3. T calls `POST /fields/assign { fieldId: F, staffId: <T's staff> }`.
  4. B calls `POST /marketplace/offers { itemType: "field", itemId: F, price: 20 }`.
- **Expected:** steps 2 and 3 are refused (403 or 404), as `PUT /fields/F` by a non-owner already is (404).
- **Actual:**
  - Steps 2 and 3 answer 201.
  - B cannot see the foreign animals, but B's listing fails with 400 "Cannot sell field with assigned animals".
  - `fieldId: 999999` (no such field) is accepted too.
  - Control: B lists a clean field of their own without trouble.
- **Evidence:** `artifacts/review/E3b-non-owner-writes-to-bought-field.json`
- **Severity note:** this needs a crafted API request with someone else's field id, but it is a cross-user write. Ids are sequential, so any user can block any field from being sold. It is a neighbouring area (animals and assignments), reached through "the item belongs to the buyer".

### R-4. `DELETE /fields/:id` by a non-owner answers 200 and wipes the owner's staff assignments on that field — major
- **Steps:**
  1. Owner O creates field F and assigns their staff to it.
  2. Stranger T calls `DELETE /fields/F`.
  3. O reads `GET /fields` and `GET /fields/assign`.
- **Expected:** 403 or 404 (as on `PUT`), and nothing changes.
- **Actual:**
  - The delete answers 200 "field deleted". F stays in O's fields, but O's assignment on F is gone.
  - After a sale, the former seller does the same to the buyer's assignment.
  - A non-existent id also answers 200 "field deleted".
- **Evidence:** `artifacts/review/E3c-stranger-deletes-owner-field.json`, `artifacts/review/E3b-non-owner-writes-to-bought-field.json` ("read B assignments before/after S DELETE")
- **Severity note:** needs a crafted request, but it is cross-user data loss. A former owner holds the id naturally after a sale.

### R-5. Buyer receives a field holding the seller's animals when the seller adds animals during the purchase — minor
- **Steps:**
  1. Seller lists field F at 30.
  2. Buyer (funded 100) buys it.
  3. About 1.5 s into the buy, the seller calls `POST /animals { type: sheep, amount: 4, fieldId: F }` on their own field (an ordinary action).
- **Expected:** the buy is refused ("Cannot sell field with assigned animals" is checked at listing and at buy time).
- **Actual:**
  - The buy completes with 200. The buyer owns F and the seller's 4 sheep stay on it, still owned by the seller.
  - The buyer's relist of F fails with 400 "Cannot sell field with assigned animals".
- **Frequency:** 1 of 1.
- **Evidence:** `artifacts/review/E6-race-animal-on-field-during-buy.json`

### R-6. Seller gets "Offer cancelled successfully" but the offer is sold anyway — minor
- **Steps:**
  1. Seller lists a field at 25.
  2. Buyer starts `POST /marketplace/buy`.
  3. About 1.5 s later, the seller calls `DELETE /marketplace/offers/<id>`.
- **Expected:** the cancel fails ("Offer is not active" or busy), or the buy fails.
- **Actual:** the cancel answers 200 "Offer cancelled successfully". The buy then completes with 200, the offer ends `sold`, and the field and the money move.
- **Frequency:** 2 of 2.
- **Evidence:** `artifacts/review/E7-race-cancel-during-buy-round1.json`, `artifacts/review/E7-race-cancel-during-buy-round2.json`
- **Severity note:** the seller is paid, but loses an item they were told they had withdrawn. It needs the ~4 s window.

### R-7. After a sale, the seller's staff assignment stays on the buyer's field — minor
- **Steps:**
  1. Seller assigns their staff to field F.
  2. Seller lists F and a buyer buys it.
  3. Both read `GET /fields/assign`.
- **Expected:** the assignment is removed when the field changes owner. The seller no longer has that field.
- **Actual:** the seller still lists `{ fieldId: F, staffId: <seller's staff> }`. The buyer sees nothing, although someone else's staff is attached to their field.
- **Evidence:** `artifacts/review/E3b-non-owner-writes-to-bought-field.json` (steps "read S/B assignments after sale"), `artifacts/review/E3-staff-assignment-and-seller-access.json`
