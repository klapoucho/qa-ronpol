# AGENTS.md

Guidance for AI coding agents in this repository (Claude Code, Codex, Gemini CLI and others).
This file is the single source of the rules: `CLAUDE.md` only imports it, and `.gemini/settings.json`
points Gemini CLI at it.

## Project

A test automation framework for [Rolnopol](https://github.com/jaktestowac/rolnopol), built with Playwright
and TypeScript as a recruitment task. The task is in `docs/requirements-original.md` (Polish).

Current phase: Phase B: the author writes the Marketplace tests with `/qa-pick <issue>`.

## Conventions

Branch names, commit messages and the PR workflow are defined in `CONTRIBUTING.md`. Read it before the
first branch or commit; its rules apply as if they were written here.

## Rules for agents

- Write everything in English. `docs/requirements-original.md` stays a verbatim Polish copy: fix formatting and typos only.
- You may create branches and commit to them without asking, following CONTRIBUTING.md.
- **Ask before every `git push`**, before opening a PR, and before any other GitHub write (issues, comments, repo settings). Never merge a PR.
- Never commit to `main` directly. Never force-push `main`. Use `--force-with-lease` on a working branch only as part of an approved push.
- Each contributor sets their git identity locally in this repo. Do not change it.
- Use the GitHub account that has access to the issue repository. If the QA settings pin a **GitHub account** (usually in your own local settings file, see below), check before any `gh` command that `gh api user --jq .login` prints it. If it does not, stop and ask: the machine may have another account logged in.
- Exceptions: `/qa-pick` may do these on the issue it tests without asking:
  - add the current `gh` account as assignee (`gh issue edit --add-assignee @me`);
  - post its testing summary as one comment and edit that same comment later (§5 of the skill);
  - set the issue's native Status to In progress when it takes the issue and to In review when the run ends. Never Done and never close the issue; PRs use `Refs #N`, not `Closes #N`.
  Every other GitHub write still needs approval.

## Local settings

Settings for one machine (for example the pinned GitHub account) go in `AGENTS.local.md`, which git
ignores. The file is optional; `AGENTS.local.example.md` is the template to copy. Claude Code also loads
`CLAUDE.local.md` by itself, so either name works there.

- If `AGENTS.local.md` exists and your agent has not loaded it, read it at the start of the session: it
  adds to the QA settings below.
- If no GitHub account is pinned and `gh auth status` lists more than one account, stop before the first
  `gh` command, ask the user which account to use, and offer to create `AGENTS.local.md` from the template.

## Skills

The QA workflow is a set of skills in the [Agent Skills](https://agentskills.io) format (a folder with a
`SKILL.md`). The files live in `.claude/skills/`; `.agents/skills` is a symbolic link to the same folder,
for agents that look there.

| Skill | Use |
| --- | --- |
| `qa-pick` | Coordinator of an autonomous QA run for one issue or story. |
| `qa-test` | Manual and exploratory QA of one story. |
| `qa-review` | Fresh-context review of a finished QA run. |
| `playwright-cli`, `playwright-trace` | Upstream skills for the Playwright CLI. Never edit them. |
| `testing-rules/` | Not a skill: the testing rules the skills and `docs/writing-tests.md` refer to. |

- The skills name actions, not tools ("start an agent with fresh context", "ask the user"). What each
  action is in your agent is in `.claude/skills/qa-pick/references/agent-tools.md`.
- `/qa-pick <issue>` is how Claude Code starts a skill. In another agent, start the `qa-pick` skill the
  way that agent does and pass the issue number or story text. If your agent has no skill support, read
  `.claude/skills/qa-pick/SKILL.md` and follow it.

## QA settings

- App URL: http://localhost:3000 (Rolnopol 1.126.0 in Docker). This is the `dev` environment, the default for everything below.
- Environments: `APP_ENV` selects one from `src/config/environments.ts`. `dev` (default) is the local app and what CI starts: manual QA, new tests, the gate and the stability runs all use it. `staging` is a placeholder at the same address. Run tests there only when the user asks ("run the tests on staging"): `APP_ENV=staging npx playwright test <files>` or `npm run test:staging`, then report what passed and failed. A failure there may mean staging lacks the change: report it, never edit a test to make it pass on staging. Never start, stop or reset an environment other than `dev`, and do no manual QA there unless asked.
- API base URL: http://localhost:3000/api/v1
- Start the app: `npm run app:up` in this repo. Agents may start the app when it is not running. They never stop or reset it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`, `POST /api/debug/database/restore-base`); only the author does.
- Rate limit: 100 API requests per 30 s per IP, shared by every worker and agent. Send `X-Synthetic-Token: local-synthetic-token` (or `SYNTHETIC_TOKEN` from `.env`) on manual API calls to skip it; the Playwright config already sends it.
- Roles: user → `POST /api/v1/register` with `{ email, displayedName, password }` returns a token. New users have 0 ROL; add funds with `POST /api/v1/financial/transactions`. Never use the demo accounts.
- Test framework: Playwright Test (TypeScript). Framework code in `src/`, tests in `tests/{api,ui,ui-mocked}/<feature>/`, conventions in `docs/writing-tests.md`. Runner process name: `playwright`
- Install dependencies: `npm ci` (needs Node 24 or newer; 26 is pinned in `.nvmrc`, so `nvm use` selects it)
- Gate: `npm run typecheck`, `npx eslint <files>`, `npx playwright test --list <files>`
- Main branch: main
- Issue repository: klapoucho/qa-ronpol
- Issue status: the issue's native Status (GraphQL `setIssueStatus`), In progress → In review; the author sets Done. No Project board.
- GitHub account: not pinned here. Pin yours in your local settings file (`- GitHub account: <login>`) when the machine has more than one `gh` account logged in.
- App repository: jaktestowac/rolnopol
