# QA lessons

Lessons applied after `/qa-pick` runs, newest first. One line per lesson, with the run id.

- 2026-11-26-issue-12-marketplace-business-rules: writer prompt sizes the spec to the story's Test section (one case per rule, no multiplying by item type or boundary variant) — the first T2 had 50 tests and the author had it trimmed to 13.
- 2026-11-26-issue-12-marketplace-business-rules: tester prompt checks a rule's UI form as well as its API, and old tokens (logout, deleted account) on money-moving endpoints — the reviewer found the form's min=1 and a deleted account that still buys.
- 2026-11-26-issue-12-marketplace-business-rules: tester prompt requires evidence for every Problems claim, not only every PASS — the reviewer found a relist claim resting on a different case.
- 2026-11-26-issue-12-marketplace-business-rules: testing-rules build boundary strings in code with a length check, and compare money rounded to cents — two false FAILs (a 318-character "300" string, a float sum).
- 2026-11-26-issue-12-marketplace-business-rules: unattended-runs warns that deleting an account can hand its data to the next registration — the app reuses freed user ids, which contaminated the writer's parallel runs.
- 2026-11-26-issue-12-marketplace-business-rules: `.qa/notes/playwright-cli.md` started: CLI output lands in the current directory; screenshot paths must be absolute.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: tester prompt covers transfer/ownership stories (every item type; what the previous owner and others can do before, during and after the transfer) — the reviewer found 4 major bugs there.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: "changed by" assertions start every actor at a non-zero, non-round value (testing-rules/general.md, tester prompt) — the test reviewer caught a seller starting at 0.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: QA settings install command names the Node 26 pin and `nvm use` as the fix — the writer lost time on EBADENGINE when a shell had Node 22.
