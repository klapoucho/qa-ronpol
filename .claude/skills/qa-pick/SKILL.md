---
name: qa-pick
description: Autonomous QA run for one story given after the command as free text or as a GitHub issue number — a coordinator starts an unattended QA tester agent, then a fresh QA reviewer that checks coverage and tries to break the feature, posts a testing summary as a comment on the issue, then a separate test-writer agent and a fresh-context test reviewer, and ends with bug-KB updates and applied lessons. Use when the user types "/qa-pick <story text>" or "/qa-pick <issue number>", or says "follow up on <run-id>" for a run started this way.
---

# QA Pick — coordinator for autonomous QA runs

You are the **coordinator**. You don't test or write tests yourself: you turn the story into a run, start the agents, pass results between them, and own the summary, the bug KB and the retro. Read `references/vision.md` (next to this file) first — it defines how we test and what a good report is.

## Input

The text after `/qa-pick` (`$ARGUMENTS` in Claude Code; in another agent, whatever the user gave when starting this skill) takes one of two forms:

- **GitHub issue** — the argument is only an issue reference: `12`, `#12`, or an issue URL. The issue lives in the **Issue repository** from QA settings (a URL names its own repo). See §1 for how it becomes the story.
- **Story text** — anything else: what to test, usually a user story with acceptance criteria, sometimes just a feature description.

If it is empty, ask the user for an issue number or the story text and stop.

Project specifics (app URL, how to start it, API base URL, accounts/roles, test framework) come from the project's `AGENTS.md`, section **QA settings**. When QA settings list several **Environments**, the whole run (manual QA, test writing, gate, stability runs) uses the default one; another environment is used only for the check in "Running on another environment". If that section is missing or the app is not reachable, ask the user once, then continue unattended.

## Paths

| What | Where |
|---|---|
| Run folder `{RUN_DIR}` | `.qa/runs/<run-id>/` — `<run-id>` = `YYYY-MM-DD-<kebab-slug-of-story-title>` |
| Story | `{RUN_DIR}/story.md` — the input text verbatim, or the issue + linked PR (§1) |
| PR material (issue path only) | `{RUN_DIR}/pr-files.txt`, `{RUN_DIR}/pr.diff` |
| Scratch (seed/probe scripts, session state) | `{RUN_DIR}/scratch/` |
| Evidence | `{RUN_DIR}/artifacts/` (reviewer: `artifacts/review/`) |
| Bug KB | `.qa/bugs/<group>/<method>-<area>--<slug>.md` — `<group>` is `ghissue-<N>` on the issue path, `<run-id>` for story text, `external` for external bugs; `<method>` is the lowercase HTTP method of the request the bug's Expected names first (the one that should have answered or behaved differently), left out with its `-` for a UI bug that no single request shows; `<area>` with `/` replaced by `-` (`api/marketplace/buy` → `post-api-marketplace-buy--<slug>.md`, `ui/login/validation` → `ui-login-validation--<slug>.md`). A known bug stays in the folder it was filed in. |
| Tool notes | `.qa/notes/<tool>.md` (e.g. `playwright-cli.md`) |
| Lessons log | `.qa/lessons.md` |
| Templates | `templates/` next to this file |
| Testing rules | `.claude/skills/testing-rules/` |

**Give every agent absolute paths** (`{RUN_DIR}` = `<repo root>/.qa/runs/<run-id>`, skills = `<repo root>/.claude/skills`): the run folder is not committed until §6 or §8, so it does not exist in the writer's worktree, and the skills may not be on the main branch yet. In this repo `.qa/` is committed, except `runs/*/scratch/`, which holds live tokens and is ignored.

Never write outside the repository. Secrets (passwords, tokens) never go into reports, the bug KB, skills or anything committed.

## Agents and sessions

The pipeline has four roles:

| Role | When |
|---|---|
| QA tester (`qa-test` skill) | §3 |
| QA reviewer (`qa-review` skill) | §4, unless the tester is BLOCKED |
| Test writer | §6, unless automation is skipped |
| Test reviewer | §6, when the writer's branch is ready |

The skill names actions ("start an agent", "message the agent", "ask the user"), not tools: `references/agent-tools.md` says what each one is in your agent, and what to do when it has no agents of its own.

**You decide how to staff them.** Use as many subagents as the run needs — e.g. split a large story into parallel testers (UI and API, or one per area), add a reviewer round, or start a helper for a side question. Where the harness offers separate sessions, use one for work the user may want to open, steer or review on its own (a long test-writing branch, a follow-up). Choose the model and effort per agent from the task: deeper reasoning for exploratory testing, reviews and tricky automation; lighter for mechanical steps. Record what you started and why in `summary.md`.

Two rules stay fixed whatever you choose:
- **Independence:** the QA reviewer and the test reviewer start with fresh context and get only what §4/§6 give them — never the tester's or writer's own reasoning. Say "start with a fresh context" in the prompt of every agent you start: some agents otherwise hand the new one a copy of your conversation.
- **Isolation:** agents that run at the same time never share a browser session, a scratch path or a git worktree (see `testing-rules/unattended-runs.md`). Parallel testers each write their own files (`report-<area>.md`, `results-<area>.json`, `handoff-<area>.md`, `artifacts/<area>/`), and you merge them into `report.md`, `results.json` and `handoff.md` before §4.

### Monitoring (every agent)

Append to every agent prompt: *"Time-box: <tester 3h · reviewer 1.5h · writer 2h · test reviewer 1h>. Stop and report to the coordinator when you hit it. Also report to the coordinator and wait — never chase silently — when blocked for ~15 min (same failure twice, broken env, unclear scope). Writers: do not refactor shared framework code unless the new test needs it; an existing test that fails gets one control run on the main branch, a note in `struggles`, and you move on. Prefix every Playwright CLI problem in `struggles` with `pwcli:` (command, what happened, the workaround)."*

At every notification from a background agent, check real progress (new files in `{RUN_DIR}`, commits, a running test process) — don't just answer "still running". A test run with a long elapsed time but almost no CPU (`ps -eo etime,time,command | grep <test runner from QA settings>`) is hung: message the agent at once. On a stall, an env problem or a scope question: ask the user (for env problems name the exact command to run). At the time-box: message the agent to wrap up with what's verified.

On the issue path with a linked PR, check at every notification whether the PR moved: `gh pr view <PR> --repo <pr repo> --json headRefOid,state,mergedAt` against the head SHA in `story.md`. A new commit, force-push or merge changes what is being tested. If the app under test changes during the run (new deploy, new commit on the tested branch), tell the active agent at once — results from before and after the change must not be mixed. The tester records the app version or commit in the report's env line.

## 1. Set up the run

1. Derive a short title from the story (issue path: the issue title) and the `<run-id>` (issue path: `YYYY-MM-DD-issue-<N>-<slug>`). `mkdir -p {RUN_DIR}/artifacts {RUN_DIR}/scratch`.
2. Write `{RUN_DIR}/story.md`:
   - **Story text:** the input, verbatim.
   - **GitHub issue** (`<repo>` = Issue repository from QA settings, or the repo in the URL). First check the account, before any other `gh` call, reads included: `gh api user --jq .login` prints the active account. If the QA settings pin a **GitHub account** (in `AGENTS.md` or the user's own local settings file, `AGENTS.local.md` or `CLAUDE.local.md`) and the active one differs, stop and tell the user to switch (`gh auth switch -u <account>`): never read or write as the wrong account. With no pin, any account works. Then check what it may do on the repo: `gh api repos/<repo> --jq .permissions`. `push` (or `maintain`, `admin`) allows assigning and commenting with images; `triage` allows assigning and a text-only comment; `pull` alone allows only a text-only comment. A 404 means no access: tell the user and stop. Put the account and its access level in `story.md`'s source line. Then read-only `gh` calls only:
     ```bash
     gh api repos/<repo>/issues/<N> --jq '.pull_request != null'   # issues and PRs share numbers
     gh issue view <N> --repo <repo> --json number,title,body,labels,state,url,comments,closedByPullRequestsReferences
     ```
     If the first command prints `true`, `<N>` is a PR: use it as the linked PR and take the issue it closes from its body (`Closes #M`, `Fixes #M`); if it closes none, its description is the story.
     **Linked PRs** come from `closedByPullRequestsReferences` (the PRs GitHub links to the issue). Only if that is empty, search by reference in the Issue repository and in the **App repository** from QA settings, if one is set: `gh pr list --repo <r> --search '"#<N>" in:body' --state all --json number,title,url,state` — and check each hit really names this issue. Several PRs: take the most recent open one; none open: the most recent merged one; none at all: test from the issue alone. For the chosen PR:
     ```bash
     gh pr view <PR> --repo <pr repo> --json title,body,url,headRefOid,state
     gh pr view <PR> --repo <pr repo> --json files --jq '.files[].path' > {RUN_DIR}/pr-files.txt
     gh pr diff <PR> --repo <pr repo> > {RUN_DIR}/pr.diff
     ```
     `story.md` then holds, in this order: a source line (issue URL, state, labels; PR URL, state and head SHA, or "no linked PR"), the issue title and body, every comment with author and date (comments often supersede the body — keep them all), and the PR description (it may contain a test plan). Copy the texts verbatim; don't summarise them.
     If the issue is closed, say so in the source line and continue. If `gh` can't read it (wrong number, private repo, not logged in), tell the user the error and stop.
3. **Take the issue** (issue path only) — it tells others the story is being tested:
   - Skip this step when the account has only `pull` access (step 2), and say so in chat.
   - Re-check the account right before assigning (`gh api user --jq .login`, as in step 2): the active account can change during a run. If it is not the account step 2 checked, stop and tell the user to switch: never assign the wrong person.
   - `gh issue edit <N> --repo <repo> --add-assignee @me`. This only adds; never remove other assignees. If someone else is already assigned, mention it in chat and continue.
   - Do this without asking only when the project's `AGENTS.md` allows self-assignment for `/qa-pick`; otherwise ask once before assigning.
   - Set the issue's Status to **In progress** (see "Issue status" below).
4. **Known bugs** in the area, as the main branch holds them on the remote (the local checkout may be behind): `git fetch origin && git grep -il -e <kw1> -e <kw2> -e <kw3> origin/<main branch> -- .qa/bugs/` with 2–3 keywords from the story (skip if the folder doesn't exist yet). Give agents the paths without the `origin/<main branch>:` prefix; a file missing from the local checkout is read with `git show origin/<main branch>:<path>`. Before filing a bug in §5, search the same way for the same symptom.
5. **Kind**: `api` (only endpoints), `ui` (screens), or `ui+api`. Decide from the story; when unsure, `ui+api`.
6. Check the app is reachable (`curl -s -o /dev/null -w '%{http_code}' <app URL>`). If not, tell the user the start command from **QA settings** and wait.

Nothing else is asked — the rest is unattended.

### Issue status

GitHub issues have a native **Status** (Backlog, Todo, In progress, In review, Done, Not planned, Duplicate; a preview feature, set through GraphQL, not `gh issue edit`). `/qa-pick` sets it twice: **In progress** when it takes the issue (§1 step 3), **In review** when the run ends (§8e). It never sets Done and never closes the issue: the author does that after reading the results. Test PRs therefore reference the issue with `Refs #<N>`, never `Closes`, `Fixes` or `Resolves`: a merge would close the issue and set it to Done.
```bash
# status ids by name, and the issue's node id
gh api graphql -f query='{repository(owner:"<owner>",name:"<name>"){planningStatuses(first:20){nodes{id name}} issue(number:<N>){id status{name}}}}'
# set it
gh api graphql -f query='mutation($i:ID!,$s:ID!){setIssueStatus(input:{issueId:$i,statusId:$s}){issue{number status{name}}}}' -f i=<issue id> -f s=<status id>
```
Look the ids up by name each time; don't hard-code them. Re-check the account first, as for every GitHub write. A closed issue must be reopened first (`gh issue reopen`); reopening resets the status to Backlog. Do it without asking only when the project's `AGENTS.md` allows it for `/qa-pick`.

## 2. Plan check

None — the tester writes `plan.md` and continues (see `testing-rules/unattended-runs.md`).

## 3. QA tester

Start a background tester agent (or several, one per area — see "Agents and sessions"):

> You are the QA tester for the story in `{RUN_DIR}/story.md` ("<title>"). This is an **unattended run**: invoke the `qa-test` skill with `{RUN_DIR}` = `<path>` and follow `.claude/skills/testing-rules/unattended-runs.md`. Follow the project's `AGENTS.md` (QA settings) and `.claude/skills/qa-pick/references/vision.md`. Kind: <api | ui | ui+api>. Known bugs in this area to re-check: <list or "none">.
> **Do the testing phases only. Do not write automated tests, create branches or worktrees, commit, push or open PRs, and never comment on issues or PRs** — a separate test-writer agent does that from your handoff. Keep every seed/probe script in `{RUN_DIR}/scratch/` (the writer and the reviewer reuse them): take the browser session name and the output folder as parameters, never hard-wired.
> Every PASS needs its own recorded artifact (log line, JSON response, screenshot). Before handing back, check that your artifact files really contain every case you claim, and run `find {RUN_DIR}/artifacts -type f -exec md5 -r {} + | sort | awk 'c[$1]++'` (Linux: `md5sum` instead of `md5 -r`) — it prints any byte-identical duplicates, and no two claims may rest on one of them. When end-state screenshots look the same for several cases, cite the per-case log/JSON instead.
> UI: after each navigation save the console errors (`playwright-cli -s=<run-id> console error > {RUN_DIR}/artifacts/console-<step>.txt`) and put a **Console** line in the report — every error either explained or reported.
> Features that block, close or tear down a form or dialog: check every kind of in-flight user work at that moment — unsaved input, uploads, open dialogs — not only typed text.
> Check every claim in the story about what the API sends or accepts against the real API before you plan around it.
> API stories: when a screen sets the same rule (a form with its own limits), check one boundary through that screen too — the form and the API can disagree. On every endpoint that moves money or items, also try the token of a logged-out user and of a deleted account.
> Every claim in Problems needs its own artifact too, not only every PASS: a FAIL that cites evidence for a different case is unproven.
> A finding you call pre-existing needs a repro on the pre-change version, not a code-reading argument. Rate severity by how users reach it: a routine action is major, crafted input only is minor.
> Removal/hardening stories: name what the removed control protected against, and check that data it leaves behind still grants nothing anywhere it is read.
> Matching/normalisation stories: test the rules in combination, and check that input repeating stored data exactly still matches.
> Screens that render user-supplied data: try HTML in every value the screen shows (names, numbers, descriptions, labels), sent through the API where the form refuses it — not only in the value a known bug names.
> Transfer/ownership stories (sales, handovers, assignments): test every item type the story names, and what the previous owner and other users can still do to the item before, during (concurrently with) and after the transfer — edit, delete, cancel, attach things to it. Don't call a mid-operation failure untestable before trying a concurrent action by the other party.
> Balances, counters and quantities: give every actor a non-zero, non-round starting value in the seed recipe you hand off, so "changed by X" differs from "set to X".
> Money-moving flows: time one funding and one purchase alone and with ~4 in parallel, find the page's own request timeout, and put both in the handoff, so the writer knows before the stability run whether parallel tests can queue past it. Scripts that move money check the state first (offer still active), save after every step, and are never re-run blindly after a crash.
> Every visual PASS needs geometry that could have failed (measure alignment in a container wider than its content) and every state the plan lists.
> While testing, collect what a test writer will need and fill `.claude/skills/qa-pick/templates/handoff.md`.
> Write into `{RUN_DIR}`: `plan.md`, `report.md` (from `templates/report.md`; Automation section: "pending — test writer"), `results.json` (from `templates/results.json`; `automation.status`: `pending`, or `skipped` + `skip_reason` if nothing is worth automating; fill `struggles`), `handoff.md` and `artifacts/`. If a file write is refused, return that file's full contents in your final message under a `## <file name>` header instead. End with a 3-line summary: status, top finding, automation candidates count.

When it finishes, check that `report.md`, `results.json` (validate: `python3 -m json.tool`) and `handoff.md` exist in `{RUN_DIR}`; save any file returned in the message instead. If the story is BLOCKED, skip §4 and §6, write the summary (§5) with the blocker, then §8.

## 4. QA reviewer — prove it, then try to break it

Start a background reviewer agent. Give it only the run folder — never the tester's final message:

> You are the QA reviewer for the story in `{RUN_DIR}/story.md` ("<title>"). Invoke the `qa-review` skill with `{RUN_DIR}` = `<path>`. Never comment on issues or PRs. This is an unattended run: follow the project's `AGENTS.md` (QA settings) and `.claude/skills/testing-rules/unattended-runs.md`. Use your own browser session name (`-s=<run-id>-review`).

When it finishes, make sure `review.md` is in the run folder and merge its output: the new problems go into `report.md` (Problems, re-sorted by severity) and the experiments into the test-case table with ids `R…`. Append the `results.json` additions (re-validate) and the `handoff.md` candidates. Append its `struggles` prefixed `reviewer:`. Recompute the verdict by the rule in `references/vision.md`: FAIL when any problem on the story's flow is critical or major (security above all, known bugs included); PASS WITH FINDINGS only when every problem is minor or cosmetic. Check the tester's verdict by the same rule, not only the reviewer's additions. Judge from the user's side, not the written acceptance criteria: a regression the story causes on a real user path fails it even when every criterion passes.

## 5. Testing summary — right after QA

1. Every finding → a bug file `.qa/bugs/<group>/<method>-<area>--<slug>.md` (see Paths) from `templates/bug.md` (all severities; `source: own: <run-id>`), and its path into `findings[].bug_file` in `results.json`. Only the coordinator files bugs. Update `last_checked` on known bugs the tester or reviewer re-checked, in the folder they were filed in.
2. Sanity-check the report against `references/vision.md`: short, user-facing, every problem has steps / expected / actual / evidence / env. Fix it if not.
3. Write `{RUN_DIR}/summary.md` from `templates/summary.md` (GitHub-flavoured Markdown; follow the comments in it): verdict, env, roles covered, the reviewer's coverage verdict, an **Automation** line (`writing tests` or `skipped — <reason>`), problems with their key screenshots, not-verified items, and the test-case table (reviewer experiments marked) and run notes folded in `<details>`. Problems first; keep it short. Never publish it as an Artifact or any other hosted page: it goes on the issue (step 4) or stays in the run folder.
4. **Post it on the issue** (issue path only; with story text, skip this step and the summary stays local). Start the §6 writer first: it never waits for this step.
   - Before posting: re-check the account (`gh api user --jq .login`, as in §1). Uploading images needs `push` access: with `triage` or `pull` only, post the summary without `--attach` and replace each image reference with its evidence path in backticks. Grep `summary.md` for `token`, `password` and `Bearer` and remove live values. Look at every image you attach: no token, password or personal data on it. `wc -c summary.md` must stay under 60000 (GitHub's limit is 65536): if it doesn't, shorten the test-case table. At most ~10 images, each under 10 MB.
   - Ask the user before posting, unless the project's `AGENTS.md` allows `/qa-pick` to comment on the issue it tests.
   - Post from the run folder, one `--attach` per image the body references, the path written exactly as in the body:
     ```bash
     cd {RUN_DIR} && gh issue comment <N> --repo <repo> --body-file summary.md \
       --attach ./artifacts/<file>.png --attach ./artifacts/review/<file>.png
     ```
     `gh` prints the comment URL (`…#issuecomment-<id>`): save it as `summary_comment_url` in `results.json`.
   - Read the posted body back (`gh api repos/<repo>/issues/comments/<id> --jq .body`) and write it over `summary.md`, so the local copy keeps the uploaded image URLs and updates need no re-upload. Every image must now point at `https://github.com/user-attachments/…`. A reference still reading `./artifacts/…` did not match its `--attach` path: upload it again and edit the comment.
   - **Updating the comment** (§6, §7, follow-ups): edit `summary.md`, then `gh api -X PATCH repos/<repo>/issues/comments/<id> -F body=@summary.md`. Always the same comment, never a new one. The account check, the grep and the approval rule apply to every update. An image added later needs its own `gh issue comment … --attach`, so do that only when the reader must see it; otherwise cite its path.
5. Tell the user in chat: verdict, reviewer verdict, top problems (one line each), the comment link (story text: the `summary.md` path), and that tests are being written.

## 6. Test writer + test reviewer

Skip this section (go on to §7, then §8) when `automation.status` is `skipped`, the story is BLOCKED, or the repository has no test framework yet (set `skipped`, reason "no framework", keep the candidates in `handoff.md`).

**Writer** — a background agent, or a separate session when the user may want to follow the branch work directly:

> You are the test writer for the story in `{RUN_DIR}/story.md` ("<title>"). Manual QA is done; read, in this order: `{RUN_DIR}/handoff.md`, `report.md`, `review.md`, `plan.md`, and the scripts in `{RUN_DIR}/scratch/`. Do not re-test the feature manually — reuse the handoff's recipe, locators and payloads; if something there turns out wrong, note it in `struggles`. Follow the project's `AGENTS.md`, `CONTRIBUTING.md` (if present) `<skills>/testing-rules/` (`general.md` + `ui.md` / `api.md`), and the project's test conventions document when QA settings name one (`docs/writing-tests.md` here); read an existing spec of the same level before writing yours and match it. Three rules for the work itself: **change only what your tests need** (do not improve neighbouring tests, page objects, comments or formatting; match the existing style even where you would write it differently; report dead code or a problem you notice in `struggles` instead of fixing it, and remove only what your own change left unused); **add nothing for later** (no page-object method, fixture option, factory field or helper that your tests do not call); **do not guess silently** (when the handoff can be read two ways, take the reading the story supports, and name the assumption in your reply and in `struggles`). All these paths are absolute and point at the main checkout — keep reading them from there, not from your worktree.
> Work in your own worktree: `git fetch origin && git worktree add .claude/worktrees/<run-id> -b test/<slug> origin/<main branch>` (no `origin` remote: skip the fetch and branch from the local `<main branch>`). Install the dependencies in the worktree (install command from QA settings) before running anything. Write lean tests for the handoff's candidates, sized to the story's Test section, not to the manual test plan: one test per scenario it names (parametrized where it says so), one case per rule that would fail if that rule broke, and no multiplying cases across item types or boundary variants unless the rule itself differs between them; a test touching an open finding is marked as an expected failure with the bug title (`test.fail()` in Playwright), or left out. Then do steps 1–3 of "Before opening a PR with automated tests" in `testing-rules/general.md` (deterministic gate; stability: `--repeat-each=10` for every new test and one slow-network run for UI tests; poison tests including partial breakage; /simplify; /code-review on the branch) and commit following the repo's commit conventions. **Do not push, do not run step 4 (test review) and do not open a PR** — the coordinator does that. Reply with: branch, test files, stability results, poison results, a draft test intent card, and `struggles`.

When it replies, start the **test reviewer** — a background agent with fresh context. Give it only the story, `plan.md` and the branch — never the writer's reply or the handoff:

> You are a fresh-context test reviewer. Story: `{RUN_DIR}/story.md`. Test plan: `{RUN_DIR}/plan.md`. Diff: `git diff origin/<main branch>...test/<slug>` in `.claude/worktrees/<run-id>` (read-only — do not edit, commit or run tests that change data). For each new test answer the step-4 questions in `.claude/skills/testing-rules/general.md` ("Before opening a PR with automated tests"); for the last one read the two test-body sections of that file and the project's test conventions document when QA settings name one. Reply with one block per test, then a list of concrete fixes and a list of points that need a human decision.

Then message the writer with the reviewer's reply: fix what can be fixed, re-run the gate, the stability runs of changed tests and any affected poison test, commit. If the fixes were substantial, run another fresh reviewer round. Then:

- **Commit the run evidence** to the test branch: copy `{RUN_DIR}` without `scratch/`, and the bug files this run created or updated, into the worktree at the same paths. Update `report.md`, `results.json` and `summary.md` with the branch first. Grep the copy for `token`, `password` and `Bearer`, judge each hit (prose mentions of the words are fine) and remove live values. Commit as `docs(qa): add qa-pick run <run-id>`.
- **ask the user** before pushing the branch and opening the PR (title in the repo's commit format, body: `Refs #<N>` (never `Closes`/`Fixes`, see "Issue status"), test intent card + **Decisions for the reviewer** — the reviewer's open points, or "none"). Push and open it only after a yes, and follow the repo's own rules for PRs and AI attribution.
- update `report.md` (Automation section), `results.json` (`automation`: `done`, branch, pr_url; append the writer's `struggles` prefixed `writer:`) and `summary.md`, then update the issue comment (§5 step 4)
- tell the user: branch / PR link + decisions needing them (one line each)

## 7. Retro — apply lessons

Read `struggles` in `results.json` (tester, reviewer and writer; ask the agent if empty): what cost time (setup, locators, seeding, env, handoff gaps), and what would have saved it? Then:

- durable app/automation knowledge → your agent's memory, or `.qa/notes/` when it has none (update an existing note before creating one; "symptom → cause → workaround"; no status logs)
- **Playwright CLI problems** (`pwcli:` struggles and anything that sounds like a CLI quirk): reproduce once with the smallest throwaway command and note the CLI version. Document real ones in `.qa/notes/playwright-cli.md` (symptom → cause → workaround, with the version); never edit the upstream `playwright-cli` / `playwright-trace` skill copies — upgrades replace them.
- review gaps (what the reviewer had to close) → improve the tester prompt above, `testing-rules` or the `qa-review` checklist
- handoff gaps (the writer had to rediscover something) → improve `templates/handoff.md` or the tester prompt
- skill or rule edits go on their own branch, one coherent commit per run, and reach the main branch only through a PR — ask before pushing
- log every applied lesson as one line at the top of `.qa/lessons.md` and list them in `summary.md` (and update the issue comment, §5 step 4)

## 8. Final evidence and clean-up

Run this at the end of every run, including skipped and BLOCKED ones.

a. **Test branch exists:** re-copy `{RUN_DIR}` without `scratch/`, and the bug files this run created or updated, into the worktree. The re-copy overwrites the files §6 cleaned, so run the same grep for `token`, `password` and `Bearer` on it and remove live values again. If anything differs from the evidence commit (`pr_url`, struggles, retro lessons in `summary.md`, bug-file updates), commit it as `docs(qa): update qa-pick run <run-id>` on the test branch and ask the user before pushing it.
b. **No test branch** (automation skipped, BLOCKED, or no framework): commit the same set on `docs/qa-run-<slug>` in a worktree cut from `origin/<main branch>`, with the same grep for `token`, `password` and `Bearer` (judge each hit: prose mentions of the words are fine; remove live values), and ask before pushing it.
c. **Only after** confirming the commit exists on the branch (`git -C <worktree> log --oneline -1 -- .qa/runs/<run-id>`), remove from the main checkout the `.qa/` files now committed there (`git checkout -- <path>` for tracked files, delete untracked ones; `scratch/` stays). Otherwise pulling `main` after the merge stops on untracked files. `.qa/lessons.md` is not touched by the clean-up: commit it with the retro's skill-edit branch, or alone on `docs/qa-lessons-<run-id>`.
d. Remove the run's worktree (`git worktree remove`) only after its branch is pushed or the user declines, never before.
e. **Issue path:** set the issue's Status to **In review** ("Issue status"), after the PR is open or the user declined the push. Never Done, never close the issue.

## Follow-ups

"Follow up on <run-id>: <what>" → if §8 already ran, restore the run first: put the committed run files and bug files back into the main checkout from the run's branch (`git restore --source=<branch> -- .qa/runs/<run-id> <bug files>`; `scratch/` was never removed), and re-add the worktree if §8d removed it (`git worktree add .claude/worktrees/<run-id> <branch>`). If that branch is already merged, pull the main branch instead and commit the follow-up's evidence through §8b. Then route it to the right agent: more manual testing → the tester, "try to break X" → the reviewer, test changes → the writer. If that agent is still reachable, message it; otherwise start a new one with the same prompt plus "Previous report: `{RUN_DIR}/report.md` — read it first; this run only covers: <request>". Results append to `report.md` under a dated "Follow-up" heading, and `summary.md` and the issue comment (§5 step 4) are updated. After a follow-up, re-run §8a or §8b.

## Running on another environment

"Run the tests on <environment>" (for a run: "follow up on <run-id>: run its tests on staging") → only when QA settings name that environment. Run the tests with the command QA settings give for it: the run's test files from its branch or worktree, or the files the user names. Start, stop and reset nothing there, and do no manual QA there unless the user asks for it.

Report per test: passed or failed, and for a failure the assertion that failed. Say which environment and address ran. A test that passes on the default environment and fails here usually means this environment does not have the change yet, or behaves differently: report that as the result. Never edit a test, mark it as an expected failure or file a bug because of this check alone; ask the user what the difference means. For a run, add the result to `report.md` (Automation section) as one line per environment.

## External bugs

"Remember this bug: <link or text>" → read it, write a bug file from the template in `.qa/bugs/external/` with `source: <link>` (or `source: user`), and say which area it was filed under.
