# Plan — Marketplace: business rules for offers and purchases (API)

**Run:** 2026-11-26-issue-12-marketplace-business-rules · **Issue:** klapoucho/qa-ronpol#12 (no linked PR) · **App:** Rolnopol 1.126.0 (Docker), http://localhost:3000/api/v1 · **Kind:** API

## QA summary

- **What it does:** a logged-in user lists a field or an animal group they own for a price; another user buys it if their balance covers it; the seller can cancel. Invalid offers, duplicate offers, buying your own offer, buying without enough money and cancelling someone else's offer are refused with a message, and nothing changes.
- **Affected areas:** `POST /marketplace/offers`, `POST /marketplace/buy`, `DELETE /marketplace/offers/{offerId}`; read-backs `GET /marketplace/offers` (browse), `/marketplace/my-offers`, `/marketplace/transactions`, `/financial/account`, `/financial/transactions`, `/fields`, `/animals`. Role: registered user (seller, buyer, stranger). Admin/demo accounts not used (QA settings).
- **Watch for:** validation done in the service with `!price` / `!itemId` truthiness checks and `parseFloat` (lax parsing, misleading messages); description regex `\w` is ASCII-only; the duplicate-offer check is read-check-write without a lock (race); cancel is not under the ledger lock (known bug); create answers 200 with `message: 201` (known bug).
- **Story gap:** the story lists AC-1, AC-2, AC-4, AC-6, AC-7. AC-3 (visibility: browse shows others' active offers, My Offers shows own) and AC-5 (effects of a sale) exist in `docs/requirements.md` §4.2 and are covered by T1 (issue 11, AC-5), T3 and T5 (AC-3). They are not acceptance criteria of this story; I use AC-3 only as the read-back ("disappears from browse", "offer list did not change") and AC-5 only as the positive control of the AC-4 boundary.

Source code of the running container was compared with the copy in the issue-11 run (`marketplace.service.js`, `marketplace.controller.js`: identical), so the code reading below matches the build under test. Every claim is still checked live.

## Test data

Fresh users per group via `POST /register` (`qa.t2.<label>.<id>@example.test`). Every actor that holds money starts at a non-zero, non-round balance (income via `POST /financial/transactions` with a test card). Fields `POST /fields`, animal groups `POST /animals { type: "cow", amount: 3 }`. Seed state in `scratch/seed-state.json`, scripts in `scratch/`.

## Checks

Markers: `[FROM STORY]` from the acceptance criteria, `[ADDED]` from the testing rules. Every refusal is checked for status, exact message, and "nothing changed" (seller balance, other party's balance, seller My Offers, observer's browse, item owner).

### A — AC-1 create offer (seller S with field F and cow group A; observer O)
| id | check | marker | negative control |
|---|---|---|---|
| A1 | Valid field offer: 200 (known bug: not 201), every field stored, offer in S's My Offers (`active`) and in O's browse with details | FROM STORY | read before: no offer for F in either list |
| A2 | Same for the animal group | FROM STORY | as A1 |
| A3 | Price matrix, field AND animal: 0, -1, -0.01, 0.001, 0.004, "abc", "", null, missing, true, {}, "12abc", [5], "1e2", 1e307, "Infinity" → 400 with a message naming the price; nothing changed | FROM STORY / ADDED | list both lists before/after |
| A4 | Price boundary accepted: 0.01, 0.005 (→0.01), 99999999.99, decimal 10.555 (→10.56); string "5" | ADDED | stored price read back |
| A5 | Description length, both item types: 300 ASCII accepted and stored exactly; 301 → 400; 300 Polish letters accepted; 301 Polish → 400 | FROM STORY | read back stored text |
| A6 | Description allowed set, both types: all Polish letters (upper+lower), each of `. , ; : ! ( ) - _`, digits, space/tab/newline → accepted and stored | FROM STORY | read back |
| A7 | Description disallowed, both types: each of `? ' " < > & / \ @ # $ % ^ * + = [ ] { } | ~` and backtick, emoji, é/ü/ß, Cyrillic, CJK, Arabic, XSS, SQL → 400 "Description contains invalid characters"; nothing changed | FROM STORY | lists before/after |
| A8 | Description empty "", whitespace-only, missing, null → accepted (optional); non-string 12345, ["a","b"], {} → ? | FROM STORY / ADDED | read back stored type |
| A9 | itemType missing / "Field" / "tractor"; itemId missing / 0 / -1 / 99999999 / "abc" / 1.5 | ADDED | as A3 |
| A10 | Not owned: another user's field and animal group → 404 "Item not found or not owned by user"; nothing changed for either user | FROM STORY | the same request by the owner succeeds |
| A11 | Field with animals on it → 400; animal group placed on a field → 400 | ADDED (user expectation) | — |
| A12 | Auth: no token 401; invalid token (known bug 403); malformed JSON (known bug 500) | ADDED | — |

### B — AC-2 one active offer per item
| B1 | Second offer for a listed field → 400 "Item is already offered for sale"; same with another price/description; only one active offer | FROM STORY | first create 200 |
| B2 | Same for the animal group | FROM STORY | |
| B3 | After cancel the item can be listed again | ADDED (user expectation) | |
| B4 | Field id == animal id of the same user: both can be listed (the rule is per item, not per id) | ADDED (combination) | |
| B5 | Two concurrent creates for the same item (field and animal, 3 rounds) → exactly one active offer | ADDED (race) | |

### C — AC-4 buy, balance boundary (non-round starting balances)
| C1 | Field at 50.25, buyer balance exactly 50.25 → 200, buyer 0, seller 17.43 + 50.25 | FROM STORY | pairs with C2 |
| C2 | Field at 50.25, buyer balance 50.24 → 400 "Insufficient funds…"; both balances, offer active + in browse, field owner, both histories unchanged | FROM STORY | |
| C3 | Animal at 33.33: buyer 33.33 → 200; buyer 33.32 → 400 + nothing changed | FROM STORY | |
| C4 | Buyer with no money at all → 400, nothing changed | ADDED | |
| C5 | One balance (61.17), two offers at 40 bought concurrently → one 200, one 400; no overdraft | ADDED (race) | |

### D — AC-6 own offer
| D1 | Funded seller (88.88 ≥ price) buys own field offer → 400 "Cannot buy your own offer"; nothing changed | FROM STORY | funds cannot explain the refusal |
| D2 | Same for the animal group | FROM STORY | |
| D3 | Unfunded seller buys own offer → still the own-offer message (rule order) | ADDED | |

### E — AC-7 cancel
| E1 | Stranger (proved valid: reads own data) cancels S's field offer → 403 "Not authorized to cancel this offer"; offer still active, in browse, and still buyable afterwards | FROM STORY | the seller's own cancel works (E3) |
| E2 | Same for an animal offer | FROM STORY | |
| E3 | Seller cancels → 200; status `cancelled` in My Offers; gone from O's browse; buy → 404; balances unchanged | FROM STORY | before: in browse |
| E4 | Cancel again → 400; cancel a sold offer (seller → 400, buyer → 403); unknown id 404; id "abc" / 0 → 400; no token 401 | ADDED | |
| E5 | After a sale the former owner cannot list the sold field / animal (404); the buyer can | ADDED (transfer) | |

### F — Regression re-checks (known bugs, `.qa/bugs/ghissue-11/`)
create-offer status, buy offerId 0 message, string offerId, malformed JSON, invalid token, cancel during buy, item edited after listing, non-owner attaches animals (blocks AC-1 listing). Not re-checked (outside this story's rules): non-owner delete wipes assignments, field deleted during buy, animals added during buy, seller assignment survives sale, OpenAPI history shape.

### G — Contract
Compare every observed status/body of the three write operations with `/schema/openapi.json` (copy in `scratch/openapi.json`).
