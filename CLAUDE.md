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
- The git identity is set locally in this repo (`klapoucho`). Do not change it.
- This repo belongs to the `klapoucho` GitHub account. Before any `gh` command, check that `gh api user --jq .login` prints `klapoucho`. If it does not, stop and ask, because the machine also has a work account logged in.
- Exception: `/qa-pick` may add the `klapoucho` account as assignee of the issue it tests (`gh issue edit --add-assignee @me`) without asking. Every other GitHub write still needs approval.

## QA settings

- App URL: http://localhost:3000 (Rolnopol 1.126.0 in Docker)
- API base URL: http://localhost:3000/api/v1
- Start the app: `npm run app:up` in this repo. Agents may start the app when it is not running. They never stop or reset it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`, `POST /api/debug/database/restore-base`); only the author does.
- Rate limit: 100 API requests per 30 s per IP, shared by every worker and agent. Send `X-Synthetic-Token: local-synthetic-token` (or `SYNTHETIC_TOKEN` from `.env`) on manual API calls to skip it; the Playwright config already sends it.
- Roles: user → `POST /api/v1/register` with `{ email, displayedName, password }` returns a token. New users have 0 ROL; add funds with `POST /api/v1/financial/transactions`. Never use the demo accounts.
- Test framework: Playwright Test (TypeScript). Framework code in `src/`, tests in `tests/{api,ui,ui-mocked}/<feature>/`, conventions in `README.md`. Runner process name: `playwright`
- Install dependencies: `npm ci` (needs Node 26, pinned in `.nvmrc`; if `node -v` shows another version, run `nvm use` first)
- Gate: `npm run typecheck`, `npx eslint <files>`, `npx playwright test --list <files>`
- Main branch: main
- Issue repository: klapoucho/qa-ronpol
- GitHub account: klapoucho
- App repository: jaktestowac/rolnopol
