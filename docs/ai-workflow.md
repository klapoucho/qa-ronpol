# AI-assisted workflow

This project is built with an AI coding agent (Claude Code), openly: agent commits carry a `Co-Authored-By:`
trailer and agent PRs a "Generated with Claude Code" line ([CONTRIBUTING.md](../CONTRIBUTING.md)).

- **Phase A** (built): the framework, CI, the `qa-pick` skills adapted to this repo, and the issue texts, built
  task by task from [the implementation plan](implementation-plan.md). No Marketplace tests.
- **Phase B** (done): the author wrote T1–T5 with `/qa-pick <issue>`, one issue per test
  ([#18](https://github.com/klapoucho/qa-ronpol/pull/18), [#25](https://github.com/klapoucho/qa-ronpol/pull/25),
  [#28](https://github.com/klapoucho/qa-ronpol/pull/28), [#34](https://github.com/klapoucho/qa-ronpol/pull/34),
  [#36](https://github.com/klapoucho/qa-ronpol/pull/36)). The issue texts and their issue numbers are in
  [docs/test-cases/](test-cases/README.md).

`/qa-pick <issue number>` (in Claude Code, in this repo) reads the issue and runs a pipeline of agents: a QA
tester tests the story by hand (UI through the Playwright CLI, API over HTTP), a fresh reviewer checks the
coverage and tries to break the feature, a test writer automates the result on its own branch (with a
`--repeat-each=10` stability run and poison tests), and a fresh test reviewer reviews each test. Pushes and PRs
wait for the author's approval. The skills are in `.claude/skills/`, the project's QA settings in
[AGENTS.md](../AGENTS.md).

The issue shows where a run is. The coordinator assigns the author and sets the issue's status to **In
progress**, posts the testing summary as one comment, and sets **In review** when the run ends. The author
reads the results and closes the issue; test PRs say `Refs #N`, never `Closes #N`. The summary's verdict is
**FAIL** when any problem on the story's flow is major or critical (security above all, known bugs included);
**PASS WITH FINDINGS** is for minor and cosmetic problems only. Manual QA runs in the Playwright CLI's default
browser (the installed Google Chrome), the tests in Playwright's bundled Chromium; the versions may differ, and
each report names the browser it used.

Each run leaves evidence in `.qa/` (D-09): `runs/<run-id>/` with the story, plan, report, results and
screenshots, bug files in `bugs/<group>/` (for example `bugs/ghissue-11/`), and lessons in `lessons.md`. A run's folder is committed on its test branch,
so it reaches `main` in the same PR as the tests it explains (D-15). `runs/*/scratch/` holds live tokens and is
ignored. Details: [.qa/README.md](../.qa/README.md).

## Other coding agents

The rules and the skills are plain files in the repository, with no plugin to install, so an agent other
than Claude Code can use them:

| File | For |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | The rules and QA settings, the single source. Codex reads it by itself. |
| [CLAUDE.md](../CLAUDE.md) | Imports `AGENTS.md` and `CONTRIBUTING.md` for Claude Code. |
| `.gemini/settings.json` | Tells Gemini CLI to read `AGENTS.md` as its context file. |
| `.claude/skills/` | The skills, in the [Agent Skills](https://agentskills.io) format. |
| `.agents/skills` | A symbolic link to `.claude/skills/`, where Codex and Gemini CLI look for project skills. |
| `.claude/skills/qa-pick/references/agent-tools.md` | What each action the skills name ("start an agent with fresh context", "ask the user") is in each agent, and how to run the pipeline without subagents. |

**What is verified:** every run in `.qa/runs/` was done with Claude Code. The Codex and Gemini CLI setup
follows their documentation as read on 2026-11-27 and has not been run; the Gemini CLI documentation also
says that Antigravity CLI replaced it in June 2026, and that agent was not checked. Expect to adjust
`agent-tools.md` on the first run with another agent. On Windows, git creates the `.agents/skills` link
only with `core.symlinks` enabled; without it, point the agent at `.claude/skills/`.


## Prerequisites for a `/qa-pick` run

Running the tests needs none of this; it is only for running the workflow yourself.

- [GitHub CLI](https://cli.github.com/) `gh` 2.99 or later, logged in with an account that can read
  `klapoucho/qa-ronpol`. Assigning the issue and setting its status need triage access, and attaching
  screenshots needs write access; with read access only, the run posts a text-only summary. With several `gh`
  accounts on one machine, pin yours: copy [AGENTS.local.example.md](../AGENTS.local.example.md) to
  `AGENTS.local.md` (git ignores it) and fill in the login. Without the file, an agent that finds several
  accounts asks which one to use.
- The Playwright CLI the skills drive, at its current version: `npm install -g @playwright/cli`. Nothing pins
  it or its browser; reports and `.qa/notes/playwright-cli.md` record the versions a run used.
