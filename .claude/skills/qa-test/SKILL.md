---
name: qa-test
description: Manual/exploratory QA of one story given as text or as a GitHub issue (with its linked PR) — writes a QA summary, challenges and expands the test plan against the testing rules, seeds test data, then executes it against the running app (UI via Playwright CLI, API via HTTP requests) and reports with evidence. Use when the /qa-pick coordinator starts a QA tester, or when the user says "test this story: <text>".
---

# QA Test — test a story end to end

> **Unattended run?** If a coordinator or the session instructions say this run is unattended, read `.claude/skills/testing-rules/unattended-runs.md` first — it replaces every stop/ask step below and sets the report and artifact paths.

Input: the story — free text, or a GitHub issue with its linked PR as collected by the coordinator (in an unattended run: `{RUN_DIR}/story.md`, plus `pr-files.txt` and `pr.diff` when there is a PR). Used directly with an issue number, collect the same material first with the read-only `gh` calls in `qa-pick` §1. `{RUN_DIR}` is given by the caller; otherwise it is `<repo root>/.qa/runs/<YYYY-MM-DD>-<slug>/` and `<run-id>` is its folder name. Project specifics — app URL, API base URL, how to start the app, roles and how to create accounts — come from the project's `AGENTS.md`, section **QA settings**.

## Phase 1 — Understand

1. Read the story. Extract the acceptance criteria; if there are none, derive the expected behaviour and mark each item **assumption**.
   **From a GitHub issue** (`story.md` starts with a source line): the comments can override the body — the latest decision wins. If there is a linked PR, also read `{RUN_DIR}/pr-files.txt` and `pr.diff` to see what changed: new or modified screens and endpoints, anything **removed or replaced** (a field, label, endpoint, validation), and permission changes. The PR description may hold a developer test plan — use it as input in Phase 2, not as the bar. Test the build that contains the PR (QA settings say where it runs) and record the PR head SHA as the app version.
2. Find what the story touches in the running app: the screens (navigate there once) and the endpoints (the app's API docs, the network log of the screen, or the source if the app repository is available locally).
3. Write a QA-friendly summary:
   - **What it does** — user-facing behaviour in plain language
   - **Affected areas** — screens, endpoints, roles
   - **Watch for** — likely regressions and neighbouring flows that share the code

## Phase 2 — Challenge and build the test plan

1. Read the rules: `.claude/skills/testing-rules/general.md`, plus `ui.md` and/or `api.md` for the story's kind.
2. Turn the acceptance criteria into checks (`[FROM STORY]`; items from a PR's test plan `[FROM PR]`, changed ones `[MODIFIED]` with the reason), then challenge them against every rule category and add what is missing (`[ADDED]`): boundaries, input validation, negative scenarios, state verification (create → exists, delete → gone), roles and permission gates from both sides, UI feedback (toasts, validation messages), more data than fits the view, data that must be filtered out.
3. Every check names the criterion it verifies or is marked **assumption**, and has a negative control: what would make it fail if the feature were partly broken.
4. Order the plan so checks for one role run together (fewer logins).

## Phase 3 — Plan approval

Present the summary, the plan with its markers, and the test data you will create. **STOP and wait for the user's approval** (unattended: write it to `{RUN_DIR}/plan.md` and continue).

## Phase 4 — Execute

### Test data

Create fresh data for the run — a fresh account per role when the app supports sign-up — through the API where possible, not the UI. Keep seed scripts in `{RUN_DIR}/scratch/` and write the created state (accounts, ids, tokens) to `{RUN_DIR}/scratch/seed-state.json` right after seeding, before any long wait. Never put passwords or tokens into the report.

### API checks

- Use `curl` or a short script; save each request + response (status, relevant headers, body) as evidence in `artifacts/` — one file per check.
- Read every write back (GET after POST/PUT/PATCH/DELETE). A status code alone proves nothing.
- Run each permission check as the forbidden role first proving that role is otherwise valid (e.g. it can read its own data), so the refusal is for the right reason.

### UI checks (Playwright CLI)

Use the `playwright-cli` skill for the command reference.

1. Open the app with a session per run and a persistent profile, then set the viewport:
   ```bash
   playwright-cli -s=<run-id> open <app URL> --headed --profile={RUN_DIR}/scratch/profile
   playwright-cli -s=<run-id> resize 1366 768
   ```
   Keep the CLI's default browser (0.1.24: the installed Google Chrome, `chrome` channel); do not pass `--browser` or a config. The automated tests run on Playwright's bundled Chromium, and the versions may differ. Record the real browser and version in the report's env line (`run-code "async page => page.context().browser().version()"`).
2. Map the navigation once: snapshot, grep it for links/buttons, find the path to the screen under test. If the path is still unclear after one attempt, record what you tried — don't guess 10 URLs.
   Snapshots don't show test ids. On each screen under test list them once for the handoff (test ids come first in automation, see `testing-rules/ui.md`):
   ```bash
   playwright-cli -s=<run-id> eval "() => [...document.querySelectorAll('[data-testid]')].map(e => e.tagName.toLowerCase() + ' ' + e.dataset.testid)"
   ```
   Interact by test id too when it helps: `playwright-cli -s=<run-id> click "getByTestId('login-submit')"`. Note elements the tests will need that have no test id.
3. Execute the plan. After each navigation save this session's console errors and read only that file: `playwright-cli -s=<run-id> console error > {RUN_DIR}/artifacts/console-<step>.txt`. Don't read the shared `.playwright-cli/` folder — other sessions write there too.
4. Evidence: a screenshot for every failure and for every visual PASS (`playwright-cli -s=<run-id> screenshot --filename={RUN_DIR}/artifacts/<id>-<slug>.png`).
   Open each screenshot you cite and check that it shows the claim — a snapshot can contain text the user never sees (covered, zero-size, transparent).
5. When done, close the browser: `playwright-cli -s=<run-id> close` (headed browsers never time out on their own).

**Process rules:**
- **Navigate in-page** (click links/buttons). `goto` reloads the page and drops in-memory app state; use it only for the first open or to test a direct URL on purpose.
- Never `open` a second time in the same session — it creates a new browser context.
- **Never read full snapshot files** — grep them. Read a slice with offset/limit only when you need context around one element.
- Use a snapshot when you need element refs, a screenshot when you need to see the page — not both for the same state.
- Refs go stale after any re-render: take a fresh snapshot before interacting with a changed page.

### Report

Fill `report.md`, `results.json` and `handoff.md` from `.claude/skills/qa-pick/templates/`. Every executed check is a row with its result and evidence, failures included. Every problem has steps, expected, actual, evidence, environment. Known bugs you were asked to re-check get a line under "Regression checks". Set the verdict by the rule in `.claude/skills/qa-pick/references/vision.md`: any critical or major problem on the story's flow, security above all and known bugs included, makes it FAIL; PASS WITH FINDINGS is for minor and cosmetic problems only.

## Phase 5 — Automated tests (only on request)

Not in an unattended QA run — the coordinator starts a separate writer. When the user asks for tests directly, follow the project's `AGENTS.md` / `CONTRIBUTING.md` and "Before opening a PR with automated tests" in `testing-rules/general.md`. Lean coverage: one positive, one negative and one edge case per behaviour, at the lowest level that catches the regression (API before UI).
