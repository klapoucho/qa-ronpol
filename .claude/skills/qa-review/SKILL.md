---
name: qa-review
description: Fresh-context review of a finished manual QA run (UI via Playwright CLI, API) — checks that the story's scope was really covered and every PASS is proven, then runs time-boxed exploratory experiments itself to close the gaps and try to break the feature. Use when the /qa-pick coordinator starts a QA reviewer, or when the user says "review the QA of <run-id>" / "try to break <feature>".
---

# QA Review — prove the tester's PASS, then try to break it

You are a fresh pair of eyes on a QA run you did not do. Assume the tester missed something: your job is to find what was not proven and to break the feature where it is most likely to break. Read `.claude/skills/qa-pick/references/vision.md` first — it is the standard you judge against.

Input: `{RUN_DIR}` = `.qa/runs/<run-id>/` (`story.md`, `plan.md`, `report.md`, `results.json`, `handoff.md`, `artifacts/`). The acceptance criteria are in `story.md`; for a GitHub issue it also holds the comments and the linked PR's description, with the changed files in `pr-files.txt` and the diff in `pr.diff`. You don't get the tester's reasoning, and you don't need it.

## 1. Review coverage (read-only)

Build the scope yourself from `story.md` (and the app) **before** reading the tester's plan, then compare. For each point record `OK` or `GAP: <what is missing>`:

- **Scope** — every acceptance criterion and every behaviour the story changes has at least one check. With a PR: every change in `pr.diff`, including what it **removes or replaces**, is covered. Also ask what a real user loses or hits because of this change (old links, bookmarks, neighbouring flows), and check that. Label those "user expectation".
- **Roles** — the roles the story touches were covered; each skip has a reason that holds. Every gate was tested from both sides (allowed can, forbidden can't), in the UI **and** directly against the API. Direct URL tried for anything hidden in navigation.
- **Evidence** — open the artifacts. The screenshot/response actually shows the claimed state (right role, right data, after the action — not a loading state or the previous screen). A PASS without evidence is `NOT PROVEN`. Compare checksums (`find {RUN_DIR}/artifacts -type f -exec md5 -r {} + | sort | awk 'c[$1]++'`, Linux: `md5sum`): a byte-identical file cited for two different checks proves only one of them.
- **Negative controls** — for each PASS: would it have failed if the feature were half broken? (a list check with only data that should appear; a filter check without data that must be filtered out; a "saved" check without reading it back.)
- **Input → output** — accepted by the form/API **and** persisted and rendered (read back after reload or over the API).
- **Data** — more data than fits the view; data that must be absent; empty state.
- **Regressions** — known bugs in the area (`grep -ril -e <kw1> -e <kw2> .qa/bugs/`) were re-checked.
- **Tool traps** — UI: state read after the page settled (re-read before calling something absent); console checked (if the report has no Console line, repeat the key navigations in your own session, save `playwright-cli -s=<run-id>-review console error` into `artifacts/review/`, and close the gap yourself); navigation vs direct URL. API: body read back, not just status; required fields and allowed values discovered, not guessed.
- **Report** — every problem has steps, expected, actual, evidence, env; severities follow user reachability (crafted input only = minor).

## 2. Decide what to explore

Write charters (one line each: *target — risk — what would break it*) for:
1. every `GAP` and `NOT PROVEN` from step 1 (close them yourself — don't send them back),
2. the riskiest areas the plan did not attack. Rank by risk: permission/data leaks > data loss or corruption > wrong data shown > broken flow > cosmetic.

Time-box: about 45 minutes of experiments; up to 90 when the story touches permissions, money or deletion. If nothing is worth attacking, say why and skip to step 4.

## 3. Try to break it

Reuse the tester's scripts and accounts from `handoff.md` / `{RUN_DIR}/scratch/`; create fresh accounts for anything destructive. Your scripts go to `{RUN_DIR}/scratch/review/`, evidence to `{RUN_DIR}/artifacts/review/`. Browser session `-s=<run-id>-review` with `--profile={RUN_DIR}/scratch/review/profile`, resized to the tester's viewport (`resize 1366 768`; the CLI default is 1280x720) unless an experiment needs another; close it with `playwright-cli -s=<run-id>-review close` when you finish.

Attack ideas — pick what fits the charter, don't run the whole list:
- **Permissions:** call the API as the forbidden role; another user's id in body/URL/nested objects; direct URL as a role without access; change a role while a session is open.
- **State & concurrency:** two sessions editing the same object; double submit; rapid toggle; back/forward after save; delete the parent while a child screen is open; stale data after an edit elsewhere.
- **Boundaries & input:** empty, max, max+1, unicode/emoji/RTL, whitespace-only, very long text, pasted rich text — real paste paths before crafted payloads.
- **Data shape:** zero / one / many (more than a page); mixed valid and to-be-filtered items; missing optional relations.
- **Time:** time zones, midnight / DST / month edges, past vs future.
- More heuristics: `.claude/skills/testing-rules/general.md`, `ui.md`, `api.md`.

Each experiment: hypothesis → action → observed → `HELD` or `BROKE` (+ evidence). Before filing a `BROKE`, rule out your own automation with a positive control on the same path — a fake product bug costs more than a missed minor one.

## 4. Output

Write `{RUN_DIR}/review.md`; if the write is refused, return its contents in your final message under `## review.md`. It contains:

1. verdict: `COVERED` (no gaps and nothing broke), `GAPS CLOSED` (you closed every gap), or `GAPS OPEN` (what you couldn't close and why)
2. the step-1 checklist with `OK` / `GAP` / `NOT PROVEN` per point
3. experiments table: `# | Charter | Hypothesis | Result (HELD/BROKE) | Evidence`
4. new problems in the `report.md` problem format (steps, expected, actual, evidence, env, severity)

In your final message also return: **`results.json` additions** (new `items` with ids `R1`, `R2`, … and new findings, as JSON), **`handoff.md` additions** (experiments worth automating — a BROKE, or a HELD that guards a real regression risk — in the automation-candidates table format), **`struggles`**, and a 3-line summary: verdict, top new problem, number of experiments (held/broke).
