# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

A test automation framework for [Rolnopol](https://github.com/jaktestowac/rolnopol), built with Playwright
and TypeScript as a recruitment task. The task is in `docs/requirements-original.md` (Polish).

Current phase: Phase B: the author writes the Marketplace tests with `/qa-pick <issue>`.

## Conventions

Branch names, commit messages and the PR workflow are defined in CONTRIBUTING.md:

@CONTRIBUTING.md

## Rules for Claude

- Write everything in English. `docs/requirements-original.md` stays a verbatim Polish copy: fix formatting and typos only.
- You may create branches and commit to them without asking, following CONTRIBUTING.md.
- **Ask before every `git push`**, before opening a PR, and before any other GitHub write (issues, comments, repo settings). Never merge a PR.
- Never commit to `main` directly. Never force-push `main`. Use `--force-with-lease` on a working branch only as part of an approved push.
- Each contributor sets their git identity locally in this repo. Do not change it.
- Use the GitHub account that has access to the issue repository. If the QA settings pin a **GitHub account** (usually in your own `CLAUDE.local.md`), check before any `gh` command that `gh api user --jq .login` prints it. If it does not, stop and ask: the machine may have another account logged in.
- Exceptions: `/qa-pick` may do these on the issue it tests without asking:
  - add the current `gh` account as assignee (`gh issue edit --add-assignee @me`);
  - post its testing summary as one comment and edit that same comment later (§5 of the skill);
  - set the issue's native Status to In progress when it takes the issue and to In review when the run ends. Never Done and never close the issue; PRs use `Refs #N`, not `Closes #N`.
  Every other GitHub write still needs approval.

## QA settings

- App URL: http://localhost:3000 (Rolnopol 1.126.0 in Docker)
- API base URL: http://localhost:3000/api/v1
- Start the app: `npm run app:up` in this repo. Agents may start the app when it is not running. They never stop or reset it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`, `POST /api/debug/database/restore-base`); only the author does.
- Rate limit: 100 API requests per 30 s per IP, shared by every worker and agent. Send `X-Synthetic-Token: local-synthetic-token` (or `SYNTHETIC_TOKEN` from `.env`) on manual API calls to skip it; the Playwright config already sends it.
- Roles: user → `POST /api/v1/register` with `{ email, displayedName, password }` returns a token. New users have 0 ROL; add funds with `POST /api/v1/financial/transactions`. Never use the demo accounts.
- Test framework: Playwright Test (TypeScript). Framework code in `src/`, tests in `tests/{api,ui,ui-mocked}/<feature>/`, conventions in `docs/writing-tests.md`. Runner process name: `playwright`
- Install dependencies: `npm ci` (needs Node 26, pinned in `.nvmrc`; if `node -v` shows another version, run `nvm use` first)
- Gate: `npm run typecheck`, `npx eslint <files>`, `npx playwright test --list <files>`
- Main branch: main
- Issue repository: klapoucho/qa-ronpol
- Issue status: the issue's native Status (GraphQL `setIssueStatus`), In progress → In review; the author sets Done. No Project board.
- GitHub account: not pinned here. Pin yours in `CLAUDE.local.md` (ignored by git) when the machine has more than one `gh` account logged in.
- App repository: jaktestowac/rolnopol
