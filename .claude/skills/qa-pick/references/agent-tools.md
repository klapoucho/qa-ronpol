# Actions and agent tools

The QA skills name actions, not tools. This table says what each action is in four coding agents.
Only the Claude Code column has been used for real runs in this repository. The Codex, Gemini CLI and
Antigravity columns come from their documentation or tool inspection (2026-11-27) and are unverified in
full runs: check the agent's current docs when something does not work, and fix this file in the retro
(§7 of `qa-pick`).

| Action in the skills | Claude Code | Codex | Gemini CLI | Antigravity |
|---|---|---|---|---|
| Project instructions | `CLAUDE.md`, which imports `AGENTS.md` | `AGENTS.md` | `AGENTS.md`, through `context.fileName` in `.gemini/settings.json` | `AGENTS.md`, loaded as workspace rules |
| Local settings (not committed) | `CLAUDE.local.md`, loaded by itself | read `AGENTS.local.md` when it exists | read `AGENTS.local.md` when it exists | read `AGENTS.local.md` when it exists |
| Where skills are found | `.claude/skills/` | `.agents/skills/` (a link to `.claude/skills/`) | `.agents/skills/` (the same link) | `.agents/skills/` (the same link) |
| Start a skill | `/qa-pick <input>`; inside a run, the Skill tool | `$qa-pick <input>`, or pick it from `/skills` | describe the task: the model activates the skill by its description and the user confirms | `/qa-pick <input>`, or read the skill's `SKILL.md` |
| Start an agent with fresh context | the Agent tool with a new agent, not a fork | ask for a subagent and say it starts with a fresh context | a subagent (`@name`, defined in `.gemini/agents/*.md`); a subagent cannot start another one | `invoke_subagent` with `TypeName: "self"` and `Workspace: "inherit"` |
| Run an agent in the background | `run_in_background` on the Agent tool | subagents run beside the main thread | not documented: run the roles one after another | `invoke_subagent` runs in the background by default |
| Message a running agent | `SendMessage` | follow up in that subagent's thread | start the agent again with "Previous report: `{RUN_DIR}/report.md`" | `send_message` with the subagent's `conversationId` |
| Ask the user | `AskUserQuestion`, or a plain question | a plain question | a plain question | `ask_question`, or a plain question |
| Keep durable knowledge | the project memory | `.qa/notes/` | `.qa/notes/` | `.qa/notes/` |
| Simplify pass, code review | `/simplify`, `/code-review <level> <branch>` | by hand, see below | by hand, see below | by hand, see below (use `invoke_subagent` for the fresh code review) |
| Attribution | `Co-Authored-By:` and "Generated with Claude Code" | the same lines, naming your agent and model | the same lines, naming your agent and model | the same lines, naming Antigravity and the model |

## Antigravity notes

- **Use `playwright-cli` in the terminal, not the built-in `browser` subagent.** The built-in `browser`
  subagent is isolated from the workspace: it cannot write screenshots directly to `{RUN_DIR}/artifacts/` or
  run `playwright-cli` commands (`console error`, `--profile`, `eval`, `run-code`) that `qa-test` and
  `qa-review` rely on.
- **Keep `Workspace: "inherit"` for the test writer.** Let the writer create `.claude/worktrees/<run-id>`
  inside the repository as §6 specifies. Do not pass `Workspace: "branch"`, or the branch and commits stay in
  an isolated clone outside the main repository.
- **Terminal sandbox.** Commands that need the network, `localhost`, Docker, `~/.config/gh/`, `~/.npm` or
  browsers (`gh`, `git fetch`/`push`, `curl`, `playwright-cli`, `npm ci`, `npx playwright test`) must run
  outside the sandbox (`BypassSandbox: true`). For an unattended run, approve prefix rules ("Always allow")
  for those commands, and avoid chaining them with `&&` or `$(...)` where practical so prefix matching keeps
  working.

## When your agent has no agents of its own

The pipeline needs separate contexts for one reason: the QA reviewer and the test reviewer must not see
the tester's or the writer's reasoning. Keep that rule with the tools you have:

1. Run one role per session. The coordinator session runs §1–§2 and stops with the exact prompt for the
   next role; the user starts a new session and pastes it. Every role reads its input from `{RUN_DIR}`
   and writes its result there, so nothing else has to be passed.
2. If the user wants a single session, run the roles one after another and write under *Agents* in
   `summary.md` that the reviews were not independent. Do not present such a run as a full `qa-pick` run.

A coordinator that is itself a subagent cannot start agents in Gemini CLI: run `qa-pick` in the main
session.

## Simplify pass and code review by hand

Where the agent has no such commands, do the same two passes on `git diff origin/<main branch>...<branch>`,
after committing:

1. **Simplify:** code the diff duplicates from `src/`, helpers nothing calls, a fixture or page-object
   method that could be an existing one. Fix what you find.
2. **Code review:** start an agent with fresh context (or a new session) that gets only the diff and the
   project's rules, and looks for correctness problems: wrong assertions, missing awaits, shared state
   between workers, broken rules from `AGENTS.md` and `docs/writing-tests.md`. Fix the findings.

Say in the test intent card which of the two ways was used.
