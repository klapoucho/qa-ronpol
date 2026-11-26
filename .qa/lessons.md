# QA lessons

Lessons applied after `/qa-pick` runs, newest first. One line per lesson, with the run id.

- 2026-11-26-issue-13-marketplace-seller-lists-an-item: qa-pick sets the issue's native Status to In progress when it takes the story and In review when the run ends, never Done; test PRs say `Refs #N` — `Closes #N` in the test PRs closed issues 11, 12 and 13 as Done.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: a critical or major problem on the story's flow (security above all, known bugs included) makes the verdict FAIL; vision.md holds the rule, and qa-pick, qa-test and the templates point to it — issue 13 was posted as PASS WITH FINDINGS with two major security bugs on its flow, and the author corrected it.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: qa-test keeps playwright-cli's default browser (installed Google Chrome) and records its version; report, summary and bug templates name the real browser — env lines said "Chromium" for a Chrome run, and the author chose to keep each tool's own default.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: report template fixes tester ids (U… UI, A… API, K… known-bug checks) and reserves R… for the reviewer — the tester's R1/R2 collided with the reviewer's.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: qa-review resizes to the tester's viewport (1366x768) — the reviewer measured layout at the CLI default 1280x720.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: handoff template asks for page readiness (data loaded once on start, responses to wait for) — the writer found the Item list stays empty for good on a slow network.
- 2026-11-26-issue-13-marketplace-seller-lists-an-item: `.qa/notes/playwright-cli.md` adds the default browser and its flag bar, the 1280x720 default viewport, `run-code` echoing secrets, no `process` in `run-code`, and cumulative `console error`.
- 2026-11-26-issue-12-marketplace-business-rules: writer prompt sizes the spec to the story's Test section (one case per rule, no multiplying by item type or boundary variant) — the first T2 had 50 tests and the author had it trimmed to 13.
- 2026-11-26-issue-12-marketplace-business-rules: tester prompt checks a rule's UI form as well as its API, and old tokens (logout, deleted account) on money-moving endpoints — the reviewer found the form's min=1 and a deleted account that still buys.
- 2026-11-26-issue-12-marketplace-business-rules: tester prompt requires evidence for every Problems claim, not only every PASS — the reviewer found a relist claim resting on a different case.
- 2026-11-26-issue-12-marketplace-business-rules: testing-rules build boundary strings in code with a length check, and compare money rounded to cents — two false FAILs (a 318-character "300" string, a float sum).
- 2026-11-26-issue-12-marketplace-business-rules: unattended-runs warns that deleting an account can hand its data to the next registration — the app reuses freed user ids, which contaminated the writer's parallel runs.
- 2026-11-26-issue-12-marketplace-business-rules: `.qa/notes/playwright-cli.md` started: CLI output lands in the current directory; screenshot paths must be absolute.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: tester prompt covers transfer/ownership stories (every item type; what the previous owner and others can do before, during and after the transfer) — the reviewer found 4 major bugs there.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: "changed by" assertions start every actor at a non-zero, non-round value (testing-rules/general.md, tester prompt) — the test reviewer caught a seller starting at 0.
- 2026-11-25-issue-11-marketplace-sale-between-two-users: QA settings install command names the Node 26 pin and `nvm use` as the fix — the writer lost time on EBADENGINE when a shell had Node 22.
