# Contributing

How changes get into this repository: branch names, commit messages and the pull request workflow.

Everything is written in English (code, docs, commits, branches, PRs). The only exception is
`docs/requirements-original.md`, which is a verbatim copy of the original task in Polish.

## Workflow

1. Never commit directly to `main`. Every change starts on its own branch cut from the latest `main`.
2. Keep the branch small and focused on one topic.
3. Before opening a PR, rebase on `main` (`git fetch && git rebase origin/main`) and make sure lint and tests pass.
4. Open a PR to `main`. The PR title follows the commit format below.
5. PRs are merged with **Rebase and merge**. Every commit on the branch lands on `main` as it is, and the history stays linear with no merge commits.

Because each commit is kept, **every commit must be a complete, working step**: it builds, lints and passes
its tests on its own. Clean up the branch (squash fixups, reword messages) before the merge, not after.
Pushing a rewritten branch uses `git push --force-with-lease`, never plain `--force`, and never on `main`.

## Branch names

```
<type>/<short-kebab-case-description>
```

`<type>` is one of the commit types below. Examples:

```
docs/project-conventions
feat/login-page-object
test/api-user-registration
ci/github-actions-workflow
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>
```

- **type**: what kind of change it is.

  | Type       | Use for                                                    |
  | ---------- | ---------------------------------------------------------- |
  | `feat`     | new framework code (page objects, fixtures, helpers)       |
  | `test`     | new or changed tests and test data                         |
  | `fix`      | a bug fix in the framework or a test                       |
  | `refactor` | code change with no behaviour change                       |
  | `docs`     | documentation only                                         |
  | `build`    | dependencies, package scripts, TypeScript and tool configs |
  | `ci`       | CI pipeline                                                |
  | `chore`    | anything else that does not touch code or tests            |

- **scope** (optional): the area, e.g. `ui`, `api`, `mocks`, `config`, `data`, `report`.
- **subject**: imperative mood, lowercase, no trailing period, at most ~72 characters
  ("add login page object", not "Added login page object.").
- **body** (optional): wrap at 72 characters. Explain *why*, not *what*. The diff already shows what.

Examples:

```
docs: add original task requirements
feat(ui): add login page object
test(api): cover user registration validation
build: configure eslint and prettier
ci: run tests on pull requests
```

One logical change per commit. Unrelated changes go into separate commits, or better, separate branches.
