# Test cases

Issue texts for the five first-delivery tests (T1-T5, requirements sections 5 and 10). Each file is exactly one issue body, with no title or labels line, so it can be passed to `gh issue create --body-file` unchanged. Paragraphs and list items are one line each, because GitHub renders single newlines in issue bodies as line breaks.

Create the labels and the issues only after the author approves the texts. Before every `gh` command below, label commands included, check that `gh api user --jq .login` prints `klapoucho`, and stop if it does not: the machine also has a work account logged in.

1. Create the labels (an issue cannot use a label that does not exist; the command fails if a label already exists, so skip it then): `gh label create <name> --repo klapoucho/qa-ronpol` for each of `marketplace`, `api`, `ui`, `ui-mocked` and `test-case`.
2. Create each issue, for example T1:
   `gh issue create --repo klapoucho/qa-ronpol --title "Marketplace: sale between two users (API)" --body-file docs/test-cases/t1-sale-between-two-users.md --label marketplace,api,test-case`

| T  | Title | Labels | File | Issue |
| -- | ----- | ------ | ---- | ----- |
| T1 | `Marketplace: sale between two users (API)` | `marketplace`, `api`, `test-case` | [t1-sale-between-two-users.md](t1-sale-between-two-users.md) |  |
| T2 | `Marketplace: business rules for offers and purchases (API)` | `marketplace`, `api`, `test-case` | [t2-business-rules.md](t2-business-rules.md) |  |
| T3 | `Marketplace: seller lists an item (UI)` | `marketplace`, `ui`, `test-case` | [t3-seller-lists-an-item.md](t3-seller-lists-an-item.md) |  |
| T4 | `Marketplace: buyer buys an offer (UI)` | `marketplace`, `ui`, `test-case` | [t4-buyer-buys-an-offer.md](t4-buyer-buys-an-offer.md) |  |
| T5 | `Marketplace: browse renders API data (UI on mocks)` | `marketplace`, `ui-mocked`, `test-case` | [t5-browse-renders-api-data.md](t5-browse-renders-api-data.md) |  |
