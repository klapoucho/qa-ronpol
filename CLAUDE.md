# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

A test automation framework for [Rolnopol](https://github.com/jaktestowac/rolnopol), built with Playwright
and TypeScript as a recruitment task. The task is in `docs/requirements-original.md` (Polish).

Current phase: Phase A, building the framework by `docs/implementation-plan.md`. Marketplace tests are not written by hand: the author writes them in Phase B with `/qa-pick <issue>`.

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
