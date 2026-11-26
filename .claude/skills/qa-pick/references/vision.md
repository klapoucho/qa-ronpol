# QA vision

> Assume nothing works. Your job is to *prove* that it does — every claim of "works" needs evidence.

## How we test

- **Always from the user's perspective, across roles.** A feature "works" only if it works for every role that should have it, and is correctly unavailable to every role that shouldn't. Take the roles from the project's QA settings; pick the ones the story touches and justify skipping the others. UI and API are different entry points for the same role.
- **Security and permission gates are first-class.** For each gate test both sides: the allowed role can, the forbidden role can't, in the UI **and** directly against the API. Hidden in the UI but allowed by the API is a bug. Reachable by direct URL but not through navigation is a bug.
- **UI must match the rest of the product** (components, spacing, copy, patterns of neighbouring screens) and **UX must be good**: confusing flows, missing feedback, dead ends and slow or jumpy states are findings, not nitpicks.
- Verify both input and output: accepted by the form/API **and** rendered/persisted correctly (read it back).
- Create more data than fits the view, including data that must be filtered out, and confirm it is absent.
- Known bugs in the area (`.qa/bugs/`) are re-checked as regressions on every related story.
- **Acceptance criteria are input, not the bar.** Use them for coverage, but decide the verdict from the user's side: a user-facing regression, dead end or broken flow the story causes fails it even when every criterion is ticked. "All criteria pass" is never a verdict on its own. Label checks beyond the criteria "user expectation".
- **Verdict:** FAIL when any problem the story's flow reaches is critical or major, security problems above all, and known bugs count too. PASS WITH FINDINGS only when every problem is minor or cosmetic. PASS: no problems. BLOCKED: the story could not be tested.
- A PASS counts only with a negative control: would this check have failed if the feature were partly broken?

## Automated tests reach a human filtered

Agent writes the test → deterministic gate (type check, lint, test listing) → stability (10 repeats in parallel, plus a slow-network run for UI) → /simplify + /code-review → fresh-context test review (why it exists, which regression, does the assertion prove the name, invented assumptions, right level, duplicates, passes when half broken) → the human sees a PR with a test intent card and only the decisions no rule can make.

## What a good report is

- **Short.** Focused on problems as the user experiences them (UI or API). No attempts at solving them; a gentle hint for developers is optional.
- Every problem has: **steps to reproduce, expected, actual, screenshot or response, environment** (URL, browser, app version, role/account) and basic data (run id, date, frequency).
- Passing items are one line each; evidence stays in the run folder.
- Uncertain = say so. Never report "works" without having seen it work.

## What we keep afterwards

- Problems hit while testing and how we got past them → memory / skills.
- Bugs found → `.qa/bugs/`.
- Not kept: status logs, run history beyond the run folders.

## Layout

- `.qa/runs/<run-id>/` — `story.md`, `plan.md`, `report.md`, `results.json`, `handoff.md`, `review.md`, `summary.md`, `artifacts/`, `scratch/`.
- `.qa/bugs/<group>/<method>-<area>--<slug>.md` — one bug per file, from `templates/bug.md` (`/` in the area becomes `-`; `<method>` is the HTTP method of the request that went wrong, none for a UI-only bug), grouped by what found it: `ghissue-<N>`, the `<run-id>` of a story-text run, or `external`.
- `.qa/notes/<tool>.md` — tool quirks and workarounds.
- `.qa/lessons.md` — lessons applied, newest first.
