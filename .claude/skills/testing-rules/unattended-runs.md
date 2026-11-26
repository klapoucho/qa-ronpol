# Unattended runs (coordinator mode)

`qa-test` and `qa-review` are interactive by default: they stop for plan approval and ask when unsure. A run is **unattended** when the caller says so — the `/qa-pick` coordinator, or the user's own session instructions. In interactive use nothing in this file applies.

## What changes in an unattended run

| Interactive (default) | Unattended |
|---|---|
| Phase 3: present the plan, **STOP for approval** | Write the plan to `{RUN_DIR}/plan.md` and continue |
| "Ask the user" when unsure | Make the most reasonable choice, record it under *Assumptions* in the report, continue. If you truly cannot proceed, mark the run **BLOCKED** with the reason and stop |
| Automated tests: only on explicit request | Follow the caller's instruction (it states whether to write tests) |
| App not running → ask | Mark the run **BLOCKED(env)** with the start command from QA settings; never start, stop or reset shared environments yourself unless QA settings allow it |
| Results reported in chat | Results written to `{RUN_DIR}` (contract below), plus a short chat summary |

Write the seed state (accounts, ids, tokens) to `{RUN_DIR}/scratch/seed-state.json` right after seeding, before any long wait or poll. A dropped connection otherwise loses the accounts you need to finish or re-check an experiment. Never copy live tokens or passwords into the report files.

`{RUN_DIR}` is given by the caller. If none is given, use `.qa/runs/<YYYY-MM-DD>-<slug>/` in the repo root.

## Report contract

```
{RUN_DIR}/
├── story.md       # the input verbatim, or the GitHub issue + comments + linked PR description
├── pr-files.txt   # issue path with a linked PR: changed files
├── pr.diff        # issue path with a linked PR: full diff
├── plan.md        # the Phase 3 block
├── report.md      # short, user-facing report (templates/report.md)
├── results.json   # machine-readable summary (templates/results.json)
├── handoff.md     # for the test writer (templates/handoff.md)
├── artifacts/     # screenshots, responses, console logs
└── scratch/       # seed/probe scripts, seed state, browser profile
```

Templates are in `.claude/skills/qa-pick/templates/`. A problem entry always has: steps to reproduce, expected, actual, evidence, environment (URL, browser, app version, role). Describe the problem from the user's side; a hint for developers is optional.

## Isolation — several runs at the same time

- **Browser:** one session per run — pass `-s=<run-id>` (reviewer: `-s=<run-id>-review`) to **every** `playwright-cli` command, with its own `--profile=` under `scratch/`.
- **Files:** never use fixed shared paths. Evidence goes to `{RUN_DIR}/artifacts/`, scratch files to `{RUN_DIR}/scratch/`.
- **Repo work:** automated tests are written in a separate git worktree per run (`.claude/worktrees/<run-id>`), so branch checkouts and test output don't collide.
- **Test runner:** run new tests **by file path**, so a run picks up only its own tests.
- **Accounts:** create fresh accounts per run, so parallel runs don't collide. Deleting an account can affect others: check what the next registered account inherits (some apps reuse the freed id with its balance and history). Until that is ruled out, delete accounts only in an isolated run, never in a parallel test suite.
- **Long scripts:** start any seeding or probe script that may run longer than about a minute in the background from the start. A foreground command times out, and a rerun repeats every write the script already made.
