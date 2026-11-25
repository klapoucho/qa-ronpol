# qa-ronpol

A test automation framework for [Rolnopol](https://github.com/jaktestowac/rolnopol), built with Playwright and
TypeScript as a recruitment task ([original task](docs/requirements-original.md), Polish).

## What this is

The framework tests one Rolnopol feature, the **Marketplace** (users sell fields and animals to each other for
ROL), on three levels: the API, the UI against the real backend, and the UI against a mocked API. It is built to
grow: a new feature or test means new files in known places, not a restructure. Every test creates its own users
and data through the API, so the suite runs fully in parallel without database resets.

**Status: the framework is built (Phase A); the Marketplace tests come next (Phase B).** The framework, the
Docker setup, CI and the AI-assisted QA workflow are in place, with 10 framework checks that prove the wiring
(`tests/*/framework/`). The five Marketplace tests (T1–T5) are written next, one `/qa-pick` run each (see
[AI-assisted workflow](#ai-assisted-workflow)).

The full requirements, with IDs (`FR-xx`, `NFR-xx`, `D-xx`) that commits and PRs refer to, are in
[docs/requirements.md](docs/requirements.md). This README summarises them.

## Tech stack and decisions

Node.js 26 LTS, Playwright Test 1.65, TypeScript 6.0 (native ES modules, ES2025, `strict`), zod 4, faker 10, ESLint
10 with `typescript-eslint` and `eslint-plugin-playwright`, Prettier, Husky with lint-staged and commitlint, Docker
Compose, GitHub Actions. Exact versions are pinned in `package-lock.json`.

| ID   | Decision                                                                                                       | Why                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| D-01 | Tests run against `BASE_URL`; the framework does not start the app. A Docker Compose setup for 1.126.0 ships with it. | The framework stays independent of how the app is hosted; the image pins the version.                          |
| D-02 | TypeScript 6.0, not 7.0                                                                                        | `typescript-eslint` does not support 7.x yet.                                                                  |
| D-03 | ESLint + Prettier, not Biome                                                                                   | Biome has no Playwright rules; a missing `await` before `expect` is the most common Playwright bug.            |
| D-04 | `tests/<type>/<feature>/`                                                                                      | The type maps 1:1 to a Playwright project (browser, auth and network setup differ), and CI can run one alone. |
| D-05 | Per-test data through the API; DB reset only on request, once, in global setup                                 | Resets between tests break parallel runs; shared data couples tests.                                           |
| D-06 | Known app bugs: `test.fail()` with a link to the bug file                                                      | The suite stays green while the bug stays visible; Playwright flags the test when the bug is fixed.            |
| D-07 | Parametrized cases in typed `.params.ts` files                                                                 | Type checking, factories and editor hints; JSON only if non-developers edit cases.                             |
| D-08 | zod schemas shared by API clients and mock payloads                                                            | A contract change breaks compilation or validation instead of letting a mock drift.                            |
| D-11 | Mocked UI tests in their own project, `tests/ui-mocked/`                                                       | Different contract and setup: fake auth and a network guard.                                                   |
| D-13 | Docker locally and in CI; agents may start the app, only the author resets it                                  | Same app version everywhere; a reset during a run destroys its data.                                           |
| D-14 | Import alias `#src/*` through `package.json` `imports`, written with the `.ts` extension                       | `tsc`, Playwright and plain Node all resolve it; no second mechanism needed.                                   |

All fifteen decisions, with the alternatives considered, are in
[requirements section 12](docs/requirements.md#12-decisions).

## Project structure

Type of test first, then feature (D-04). Each folder under `tests/` is one Playwright project.

```text
.
├── .claude/skills/        # qa-pick workflow skills and testing rules (committed for reviewers)
├── .github/workflows/     # CI: checks and tests on every pull request and on main
├── .husky/                # git hooks: lint-staged on commit, commitlint on the message
├── .qa/                   # qa-pick runs, bug files, lessons (committed, except runs/*/scratch/)
├── docs/                  # requirements, implementation plan, test case issue texts
├── scripts/app-reset.ts   # restores the app's base database (author only)
├── src/
│   ├── api/
│   │   ├── http/          # BaseApi: envelope handling, schema validation, typed ApiResponse
│   │   ├── clients/       # one client per API resource (AuthApi, UsersApi, HealthApi, DebugApi)
│   │   └── models/        # zod schemas and the types inferred from them
│   ├── ui/
│   │   ├── pages/         # one page object per screen (ProfilePage)
│   │   ├── components/    # repeated UI parts (added with the first feature that needs them)
│   │   └── session.ts     # the login cookies the app sets, built from an API token
│   ├── assertions/        # custom matchers (expect.extend), e.g. toShowFields
│   ├── mocks/
│   │   ├── mock-api.ts    # routes every /api/ request; records the ones no handler serves
│   │   ├── handlers/      # shared.ts (every page) and one file per feature
│   │   └── payloads/      # payload builders typed by the zod schemas
│   ├── data/              # factories (data/factories/) and run-unique values
│   ├── fixtures/          # Playwright fixtures; index.ts exports test and expect
│   └── config/            # env schema (zod), profiles per TEST_ENV, loader
├── tests/
│   ├── api/               # project api: no browser
│   ├── ui/                # project ui: Chromium, real backend
│   ├── ui-mocked/         # project ui-mocked: Chromium, mocked API, network guard
│   └── global-setup.ts    # app reachable? expected version? optional DB reset
├── compose.yaml           # Rolnopol 1.126.0 container with a healthcheck
├── playwright.config.ts
├── eslint.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

Today each project folder holds a `framework/` folder with the wiring checks. Marketplace tests go into
`tests/{api,ui,ui-mocked}/marketplace/`.

## Prerequisites

- **Node.js 26**, as pinned in `.nvmrc`. With nvm: `nvm install` (once), then `nvm use`.
- **Docker** with **Compose v2** (`docker compose`), for the app under test.
- Only for the author's `/qa-pick` runs:
  - [GitHub CLI](https://cli.github.com/) `gh` 2.99 or later, logged in as `klapoucho`
    (`gh api user --jq .login` must print `klapoucho`);
  - the Playwright CLI the skills drive: `npm install -g @playwright/cli@0.1.25`.

## Running the tests

From a fresh clone:

```bash
git clone https://github.com/klapoucho/qa-ronpol.git
cd qa-ronpol
nvm use                                       # Node 26 from .nvmrc
npm ci
npx playwright install --with-deps chromium
npm run app:up                                # starts Rolnopol 1.126.0 and waits until it is healthy
npm test
```

`npm run check` runs the static checks without the app (CI runs it before the tests).

### npm scripts

| Script                                 | What it does                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `npm test`                             | all three projects                                                               |
| `npm run test:api`                     | the `api` project                                                                |
| `npm run test:ui`                      | the `ui` project                                                                 |
| `npm run test:ui-mocked`               | the `ui-mocked` project                                                          |
| `npm run test:smoke`                   | tests tagged `@smoke`                                                            |
| `npm run report`                       | opens the last HTML report                                                       |
| `npm run check`                        | `typecheck`, `lint`, `format:check` and `playwright test --list` (no app needed) |
| `npm run typecheck`                    | `tsc --noEmit`                                                                   |
| `npm run lint` / `lint:fix`            | ESLint, with or without fixes                                                    |
| `npm run format` / `format:check`      | Prettier, write or check                                                         |
| `npm run app:up`                       | starts the app container and waits for its healthcheck                           |
| `npm run app:logs`                     | follows the app's logs                                                           |
| `npm run app:down` / `app:reset`       | stops the app / restores its base database (author only, see below)            |

Any Playwright option works after `--`, for example `npm test -- --grep "healthy"` or
`npm run test:ui -- --headed`.

### Configuration

Settings come from environment variables, or from a `.env` file in the repo root (`cp .env.example .env`); a
variable set in the shell wins over the file. They are validated at startup: an invalid value stops the run before
any test, with a message naming the variable.

| Variable               | Default                 | Meaning                                                                       |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `BASE_URL`             | `http://localhost:3000` | the app under test (`http` or `https`)                                        |
| `TEST_ENV`             | `local`                 | run profile: `local` or `ci`                                                  |
| `EXPECTED_APP_VERSION` | `1.126.0`               | the version the suite targets; a different one logs a warning and continues   |
| `SYNTHETIC_TOKEN`      | `local-synthetic-token` | sent as `X-Synthetic-Token` so test traffic skips the app's API rate limit    |
| `RESET_DB`             | `false`                 | `true` restores the base database once before the run (wipes shared data)     |

Profiles (`src/config/profiles.ts`) set retries, workers, reporters and timeouts:

| Profile | Retries | Workers                 | Reporters                                   | Other                                                    |
| ------- | ------- | ----------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `local` | 0       | Playwright default      | `list`, `html`                              |                                                          |
| `ci`    | 1       | 4                       | `github`, `html`, `junit` (`reports/junit.xml`) | `forbidOnly`; a test that passes only on retry fails the run |

A new environment, such as `staging`, is one more profile plus its `BASE_URL`; tests do not change.

### Reports

- `playwright-report/`: the HTML report, after every run. Open it with `npm run report`.
- `test-results/`: per failed test, a screenshot and a video; a trace on the first retry (so in CI).
- In CI: the HTML report and `reports/` (JUnit XML and the app's container log) are uploaded as workflow
  artifacts and kept for 7 days.

## The app under test

Rolnopol runs from the Docker image `jaktestowac/rolnopol:1.126.0` on port 3000 (`compose.yaml`). Global setup
checks that it is reachable and that it is the expected version before any test runs; if it is not reachable, the
run stops with `Start it with: npm run app:up`.

The `ui-mocked` project needs the running app too: it mocks only `/api/**`, the pages' HTML and JavaScript still
come from the app, and global setup checks it for every project.

- **Apple Silicon.** The image is published for `linux/amd64` only. `compose.yaml` sets the platform, so Docker
  runs it under emulation: the first start is slower, and API calls are slower than on an amd64 machine.
- **Who may reset the app.** Anyone, including AI agents, may start it with `npm run app:up`. Only the author
  stops or resets it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`): a reset wipes the data another
  run may depend on. Tests never need a reset; each creates its own users.
- **Rate limit.** The app allows 100 API requests per 30 s per IP, and all workers share one IP. `compose.yaml`
  starts it with `SYNTHETIC_TOKEN`, and every request the tests make sends the same value as `X-Synthetic-Token`,
  which the app exempts from that limit. The value is a local default, not a secret; browsers send it to every
  origin a page loads, CDNs included. Global setup stops the run when the app does not accept the token, for
  example an app started before this setting or with another `.env`. Recreating it (`npm run app:up` after
  changing the value) resets its data, so only the author does that.
- **Port 3000 is taken.** `npm run app:up` fails with
  `Bind for 0.0.0.0:3000 failed: port is already allocated`. Stop whatever listens on port 3000 (for example a
  local Rolnopol clone started with `npm start`) and run it again. The Compose project is named after the folder,
  so a second checkout of this repo in a folder with another name starts a second container and hits the same
  error; use the app the first one started (`npm test` only needs `BASE_URL`).
- **Without Docker.** Clone [Rolnopol](https://github.com/jaktestowac/rolnopol) and check out commit `fb7fd89`
  (1.126.0; the repo has no version tags, and its `main` is newer), run `npm install` and `npm start`, and point
  `BASE_URL` at it (port 3000 by default). The tests target 1.126.0; another version logs a warning and may
  fail. A running clone writes to its tracked `data/*.json` files, so its working tree changes as tests run.

## How to add a test or feature

**Naming.** Files in kebab-case; specs `*.spec.ts`, parametrized cases `*.params.ts` next to their spec; classes
in PascalCase named after the screen or resource (`MarketplacePage`, `MarketplaceApi`). Test titles state the
behaviour: `buyer cannot buy an offer above their balance`. Imports use the alias: `#src/<path>.ts`.

**Checklist** for a new feature (`<feature>` is, for example, `marketplace`):

1. Tests go in `tests/api/<feature>/`, `tests/ui/<feature>/` or `tests/ui-mocked/<feature>/`, by level. Import
   `test` and `expect` from `#src/fixtures/index.ts`, never from `@playwright/test`. No raw HTTP calls, raw
   selectors or data literals in a test.
   `src/fixtures/index.ts` exports only `test` and `expect`; import everything else a test needs from its own
   module (`#src/api/clients/...`, `#src/data/factories/...`, `#src/mocks/...`, `#src/ui/pages/...`). A new page
   object becomes a fixture (for example `marketplacePage`) in `src/fixtures/ui.fixtures.ts`. ESLint rejects
   value imports from `@playwright/test` in specs.
2. **API client:** one class per resource in `src/api/clients/`, extending `BaseApi`. Tests get it with
   `apiAs(Client, user)`. Responses are `ApiResponse` objects: `status`, `error` and `data`, which throws a clear
   error when the call failed.
3. **Schemas:** zod schemas in `src/api/models/`, types inferred from them. Keep each endpoint's real wire
   format: the envelope `{ success, timestamp, data | error }` for most endpoints, bare objects where the app
   returns them (`/api/version`, `/api/v1/statistics`).
4. **Data:** a factory in `src/data/factories/` that builds a valid entity with unique values; tests override
   only what matters. Users come from the `createUser` fixture; seed further data in fixtures, and make seeding
   errors throw.
5. **UI:** a page object per screen in `src/ui/pages/`, repeated parts as components in `src/ui/components/`.
   They expose actions and locators, no assertions. Locators: `getByTestId`, then `getByRole` with a name,
   `getByLabel`, `getByText`; CSS only as a documented last resort, never by index. Log in with
   `createUser` + `loginAs` (cookies, no login form).
6. **Matcher:** only when a check covers many fields or several sources (a card, a settled sale). Register it in
   `src/assertions/index.ts`; it reports every mismatching field and retries when it reads the UI. For plain API
   data, `toEqual` or `toMatchObject` on the whole object is enough.
7. **Mocks:** `ui-mocked` tests get the shared page-load calls (`authorization`, `feature-flags`,
   `/api/version`) answered already. Add a `src/mocks/handlers/<feature>.ts` for the feature's own endpoints,
   with payloads from `src/mocks/payloads/` built from the same zod schemas, in each endpoint's real wire format.
   Any `/api/` request no handler serves fails the test, with its method and path.
8. **Cases:** parametrized cases in `<name>.params.ts` as a typed array, each with a readable title used in the
   test name.
9. **Tags:** `@smoke` for the minimal set that proves the app works, `@critical` for paths that move money. Never
   tag the level; the project says it.
10. **Known app bug:** mark the test `test.fail()` and annotate it with a link to its file in `.qa/bugs/`.
11. **Before the commit:** `npm run check`, then run the new test; break its expected value and one step of its
    scenario (the poison test in `.claude/skills/testing-rules/general.md`) and confirm it fails both times.

## AI-assisted workflow

This project is built with an AI coding agent (Claude Code), openly: agent commits carry a `Co-Authored-By:`
trailer and agent PRs a "Generated with Claude Code" line ([CONTRIBUTING.md](CONTRIBUTING.md)).

- **Phase A** (built): the framework, CI, the `qa-pick` skills adapted to this repo, and the issue texts, built
  task by task from [docs/implementation-plan.md](docs/implementation-plan.md). No Marketplace tests.
- **Phase B** (next): the author writes T1–T5 with `/qa-pick <issue>`, one issue per test. The issue texts and
  their titles are in [docs/test-cases/](docs/test-cases/README.md); the issue numbers are added there once the
  issues exist in `klapoucho/qa-ronpol`.

`/qa-pick <issue number>` (in Claude Code, in this repo) reads the issue and runs a pipeline of agents: a QA
tester tests the story by hand (UI through the Playwright CLI, API over HTTP), a fresh reviewer checks the
coverage and tries to break the feature, a test writer automates the result on its own branch (with a
`--repeat-each=10` stability run and poison tests), and a fresh test reviewer reviews each test. Pushes and PRs
wait for the author's approval. The skills are in `.claude/skills/`, the project's QA settings in
[CLAUDE.md](CLAUDE.md).

Each run leaves evidence in `.qa/` (D-09): `runs/<run-id>/` with the story, plan, report, results and
screenshots, bug files in `bugs/`, and lessons in `lessons.md`. A run's folder is committed on its test branch,
so it reaches `main` in the same PR as the tests it explains (D-15). `runs/*/scratch/` holds live tokens and is
ignored. Details: [.qa/README.md](.qa/README.md).

## Assumptions and limits

- **Chromium only.** Firefox and WebKit are a project entry in `playwright.config.ts` away (NFR-18).
- **Marketplace only.** Other Rolnopol areas (farm resources, finance screens, admin, feature-flagged screens,
  GraphQL, WebSockets) are out of scope for the first delivery. The layout takes them without changes.
- **Rolnopol 1.126.0.** Facts about the app were read from its source and the running app
  ([requirements 4.1](docs/requirements.md#41-rolnopol)). Rolnopol contains intentional bugs; a test that hits
  one is marked as an expected failure (D-06) rather than bent to pass.
- **No secrets in the repo.** Tests create throwaway users per run, so they need no credentials. Test artifacts
  (traces, videos, the HTML report) do record those users' tokens and passwords; the values only work on that
  run's app instance. Artifacts are never committed, and CI keeps them for 7 days (NFR-20).
- **The suite does not clean up.** Tests leave their users and data behind; unique values keep tests and runs
  apart. Only the author resets the database (`npm run app:reset` or `RESET_DB=true`).

Future work (more features, browsers, sharding, OpenAPI-generated types, contract tests of the mocks) is listed in
[requirements section 13](docs/requirements.md#13-left-to-the-builder-and-future-work).

## Documentation

- [Framework requirements](docs/requirements.md): scope, decisions and the first five tests
- [Phase A implementation plan](docs/implementation-plan.md): how the framework was built, task by task
- [Test cases T1–T5](docs/test-cases/README.md): the issue texts
- [Original task requirements](docs/requirements-original.md) (Polish)
- [Contributing](CONTRIBUTING.md): branch naming, commit messages, pull request workflow
