# qa-ronpol

[![Tests](https://github.com/klapoucho/qa-ronpol/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/klapoucho/qa-ronpol/actions/workflows/tests.yml)

A test automation framework for [Rolnopol](https://github.com/jaktestowac/rolnopol), built with Playwright and
TypeScript as a recruitment task ([original task](docs/requirements-original.md), in Polish).

It tests one Rolnopol feature, the **Marketplace** (users sell fields and animals to each other for ROL, the
in-app currency), on three levels: the API, the UI on the real backend, and the UI on a mocked API.

## The five tests

| #   | Level       | Scenario                                                                 | Spec                                                                                         |
| --- | ----------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| T1  | API         | A sale between two users: money, ownership, offer status, both histories | [tests/api/marketplace/sale.spec.ts](tests/api/marketplace/sale.spec.ts)                     |
| T2  | API         | Business rules: what the Marketplace accepts and refuses (data-driven)   | [tests/api/marketplace/business-rules.spec.ts](tests/api/marketplace/business-rules.spec.ts) |
| T3  | UI          | A seller lists a field in the Create Offer form                          | [tests/ui/marketplace/create-offer.spec.ts](tests/ui/marketplace/create-offer.spec.ts)       |
| T4  | UI          | A buyer buys an offer in Browse                                          | [tests/ui/marketplace/buy-offer.spec.ts](tests/ui/marketplace/buy-offer.spec.ts)             |
| T5  | UI on mocks | Browse renders what the API returns: cards, pages, empty list, a 500     | [tests/ui-mocked/marketplace/browse.spec.ts](tests/ui-mocked/marketplace/browse.spec.ts)     |

T2 and T5 each cover several cases, so the runner lists more than five tests. A healthcheck smoke test
(`tests/api/health/`) runs next to them.

## Running the tests

You need **Node.js 24 or newer** (26 is pinned in `.nvmrc`) and **Docker** with Compose v2 for the app under test.

```bash
git clone https://github.com/klapoucho/qa-ronpol.git
cd qa-ronpol
nvm use                                       # optional: Node 26 from .nvmrc
npm ci
npx playwright install --with-deps chromium
npm run app:up                                # starts Rolnopol 1.126.0 in Docker and waits until it is healthy
npm test
npm run report                                # opens the HTML report
```

Every test creates its own users and data through the API, so the suite runs in parallel and needs no database
reset. The whole suite takes about a minute.

The list marks some tests with `✘` while the run still ends with every test passed. They are expected failures:
each checks the correct behaviour where the app has a known bug, so it counts as passed until the bug is fixed
(see [Assumptions and limits](#assumptions-and-limits)).

| Script                                            | What it does                                                    |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `npm test`                                        | the whole suite                                                 |
| `npm run test:api` / `test:ui` / `test:ui-mocked` | one level                                                       |
| `npm run test:ui-ledger`                          | the UI test that buys through the page (T4); `test:ui` skips it |
| `npm run test:smoke`                              | tests tagged `@smoke`                                           |
| `npm run check`                                   | type check, ESLint, Prettier and a test listing (no app needed) |
| `npm run app:up` / `app:down` / `app:logs`        | start, stop or follow the app container                         |

Any Playwright option works after `--`, for example `npm run test:ui -- --headed`.

### Configuration

Settings come from environment variables or a `.env` file (`cp .env.example .env`). They are validated at
startup, so an invalid value stops the run with a message naming the variable.

| Variable               | Default                 | Meaning                                                                    |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `APP_ENV`              | `dev`                   | environment to run against, `dev` or `staging` (see below)                 |
| `BASE_URL`             | the environment's own   | overrides the address of the chosen environment                            |
| `TEST_ENV`             | `local`                 | run profile, `local` or `ci`: retries, workers, reporters, timeouts        |
| `EXPECTED_APP_VERSION` | `1.126.0`               | the version the suite targets; another one logs a warning                  |
| `SYNTHETIC_TOKEN`      | `local-synthetic-token` | sent as `X-Synthetic-Token` so test traffic skips the app's API rate limit |
| `RESET_DB`             | `false`                 | `true` restores the app's base database once before the run                |

Environments are listed in `src/config/environments.ts`: `dev` is the local app (the one CI starts too), and
`staging` is a placeholder that points at the same address, because this project has no real staging server.
`npm run test:staging` (or `APP_ENV=staging` before any test command) runs the suite there. A new environment
is one more entry in that file; tests do not change. `TEST_ENV` is a separate choice: it sets how the run
behaves, not where it goes.

### Reports and CI

Every run writes an HTML report (`playwright-report/`); a failed test also leaves a screenshot, a video and, on
a retry, a trace. GitHub Actions ([tests.yml](.github/workflows/tests.yml)) runs the static checks, starts the
app in Docker and runs the tests with the `ci` profile, which adds JUnit XML and one retry. The result is on
the run's summary page, and a full-suite run publishes its HTML report to GitHub Pages:
[the newest report](https://klapoucho.github.io/qa-ronpol/), with the earlier ones under
[runs/](https://klapoucho.github.io/qa-ronpol/runs/). More in [docs/ci-and-reports.md](docs/ci-and-reports.md).

Two extras go beyond the core setup: `npm run coverage:api` reports which API operations the tests call, compared
with the app's OpenAPI contract, and a pull request runs only the smoke tests plus the tests its change touches.

## Tech stack and decisions

Playwright Test, TypeScript (strict, native ES modules), zod, faker, ESLint with `typescript-eslint` and
`eslint-plugin-playwright`, Prettier, Husky with lint-staged and commitlint, Docker Compose, GitHub Actions.
Exact versions are pinned in `package-lock.json`.

| Decision                                                              | Why                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tests are grouped by level, then feature: `tests/<level>/<feature>/`  | A level is a Playwright project (browser, auth and network differ), and CI can run one alone.       |
| Each test creates its own users and data through the API              | Tests stay independent and parallel; no shared state, no resets between tests.                      |
| UI tests log in with cookies and seed through the API                 | The UI is used only where the UI is what the test checks.                                           |
| zod schemas are shared by the API clients and the mock payloads       | A contract change fails validation instead of letting a mock drift from the real API.               |
| Mocked UI tests have a network guard                                  | A request no mock answers fails the test, so a mocked test never passes on a call nobody defined.   |
| A known app bug is an expected failure: `test.fail()` plus a bug file | The suite stays green, the bug stays visible, and Playwright flags the test once the bug is fixed.  |
| ESLint and Prettier, not Biome                                        | Biome has no Playwright rules; a missing `await` before `expect` is the most common Playwright bug. |
| The app runs from a pinned Docker image, locally and in CI            | The same app version everywhere; the framework itself only needs `BASE_URL`.                        |

All decisions, with the alternatives considered, are in [docs/requirements.md](docs/requirements.md#12-decisions).

## Project structure

```text
├── src/
│   ├── api/             # API clients (one per resource), zod schemas, typed responses
│   ├── ui/              # page objects and components, cookie login
│   ├── mocks/           # mock API for the browser: handlers, payloads, network guard
│   ├── data/            # test data factories
│   ├── fixtures/        # Playwright fixtures; index.ts exports the test and expect every spec imports
│   ├── assertions/      # custom matchers
│   └── config/          # environment variables (validated) and run profiles
├── tests/
│   ├── api/             # project api: no browser
│   ├── ui/              # projects ui and ui-ledger: Chromium, real backend
│   ├── ui-mocked/       # project ui-mocked: Chromium, mocked API
│   └── global-setup.ts  # is the app reachable, and is it the expected version?
├── scripts/             # CI test selection, API coverage report, database reset
├── docs/                # requirements, conventions, the app's quirks, the AI workflow
├── .qa/, .claude/       # evidence and skills of the AI-assisted QA workflow
├── AGENTS.md            # rules for AI coding agents (CLAUDE.md imports it)
├── compose.yaml         # Rolnopol 1.126.0
└── playwright.config.ts
```

Tests contain no raw HTTP calls, selectors or hard-coded test data: they use the API clients, page objects and
factories in `src/`. How to add a test or a feature: [docs/writing-tests.md](docs/writing-tests.md).

## Assumptions and limits

- **Marketplace only, Chromium only.** Other Rolnopol areas and browsers are out of scope; another browser is
  one more project in `playwright.config.ts`.
- **Rolnopol 1.126.0.** The app contains intentional bugs. A test that hits one is marked as an expected failure
  and links the bug file in `.qa/bugs/`; it is not bent to pass.
- **The app moves money one operation at a time.** A purchase takes about 4 s behind a global lock, and the
  page gives up after 15 s. The one UI test that buys through the page therefore runs alone, in its own
  `ui-ledger` project, after the others. More in [docs/app-under-test.md](docs/app-under-test.md).
- **No clean-up.** Tests leave their users and data behind; unique values keep tests and runs apart.
- **No secrets.** Tests create throwaway users, and the synthetic token is a local default. Reports and traces
  are never committed.

## More documentation

- [docs/writing-tests.md](docs/writing-tests.md): naming rules and the checklist for a new test or feature
- [docs/app-under-test.md](docs/app-under-test.md): running the app, its rate limit, its money queue, running without Docker
- [docs/ci-and-reports.md](docs/ci-and-reports.md): what CI runs on which trigger, the reports, API coverage
- [docs/ai-workflow.md](docs/ai-workflow.md): how the tests were written with an AI agent, and what `.qa/` holds
- [docs/requirements.md](docs/requirements.md): the full framework requirements and decisions
- [CONTRIBUTING.md](CONTRIBUTING.md): branch names, commit messages, the pull request workflow
