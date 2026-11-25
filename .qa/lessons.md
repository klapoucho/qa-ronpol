# QA lessons

Lessons applied after `/qa-pick` runs, newest first. One line per lesson, with the run id.

- 2026-11-25-issue-11-marketplace-sale-between-two-users: tester prompt covers transfer/ownership stories (every item type; what the previous owner and others can do before, during and after the transfer) — the reviewer found 4 major bugs there.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: "changed by" assertions start every actor at a non-zero, non-round value (testing-rules/general.md, tester prompt) — the test reviewer caught a seller starting at 0.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: QA settings install command names the Node 26 pin and `nvm use` as the fix — the writer lost time on EBADENGINE when a shell had Node 22.
