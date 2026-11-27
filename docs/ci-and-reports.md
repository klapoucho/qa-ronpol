# CI and reports

## npm scripts

| Script                                 | What it does                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `npm test`                             | all projects; `ui-ledger` after `api` and `ui`, one test at a time               |
| `npm run test:api`                     | the `api` project                                                                |
| `npm run test:ui`                      | the `ui` project, without the `@ledger` tests                                    |
| `npm run test:ui-mocked`               | the `ui-mocked` project                                                          |
| `npm run test:ui-ledger`               | the `ui-ledger` project alone (the `@ledger` tests), without the projects first  |
| `npm run test:smoke`                   | tests tagged `@smoke`                                                            |
| `npm run test:staging`                 | all projects against the `staging` environment (see Environments)                |
| `npm run report`                       | opens the last HTML report                                                       |
| `npm run coverage:api`                 | API coverage against the OpenAPI contract, as Markdown (see Reports)             |
| `npm run check`                        | `typecheck`, `lint`, `format:check` and `playwright test --list` (no app needed) |
| `npm run typecheck`                    | `tsc --noEmit`                                                                   |
| `npm run lint` / `lint:fix`            | ESLint, with or without fixes                                                    |
| `npm run format` / `format:check`      | Prettier, write or check                                                         |
| `npm run app:up`                       | starts the app container and waits for its healthcheck                           |
| `npm run app:logs`                     | follows the app's logs                                                           |
| `npm run app:down` / `app:reset`       | stops the app / restores its base database (author only, see below)            |

`app:down` and `app:reset` wipe data other runs may depend on; see [the app under test](app-under-test.md).

## Environments

`APP_ENV` picks the server the tests run against, from `src/config/environments.ts`:

| Environment | Address                 | Reset allowed | Used by                                    |
| ----------- | ----------------------- | ------------- | ------------------------------------------ |
| `dev`       | `http://localhost:3000` | yes           | the default: local runs, CI, new tests     |
| `staging`   | `http://localhost:3000` | no            | on request: `npm run test:staging`         |

`staging` is a placeholder: the project has no staging server, so it points at the local app and shows only
that the switch works. With a real address there, a run answers "do these tests pass on staging"; tests for a
change that staging does not have yet fail there, and that is the answer, not a reason to change them.

- Any command takes it: `APP_ENV=staging npm run test:api`, `APP_ENV=staging npx playwright test <files>`.
- Global setup prints the environment and its address first, and the HTML report shows both in its header.
- `BASE_URL` overrides the address of whichever environment is chosen. A `BASE_URL` line in `.env` therefore
  applies to `staging` too; leave it out unless the app runs somewhere else.
- `RESET_DB=true` and `npm run app:reset` work on `dev` only; on another environment they stop with an error.
- The app must accept the tests' `SYNTHETIC_TOKEN` on every environment (see [the app under test](app-under-test.md)).

## Profiles

`TEST_ENV` picks how a run behaves, on any environment.

Profiles (`src/config/profiles.ts`) set retries, workers, reporters and timeouts:

| Profile | Retries | Workers                 | Reporters                                   | Other                                                    |
| ------- | ------- | ----------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `local` | 0       | Playwright default      | `list`, `html`                              |                                                          |
| `ci`    | 1       | 4                       | `github`, `html`, `junit` (`reports/junit.xml`), run summary | `forbidOnly`; a test that passes only on retry fails the run |

## Reports

- `playwright-report/`: the HTML report, after every run. Open it with `npm run report`.
- `test-results/`: per failed test, a screenshot and a video; a trace on the first retry (so in CI).
- `npm run coverage:api`: API coverage against the app's OpenAPI contract (`docs/api/openapi.json`), as
  Markdown on stdout: operations and documented responses with a test, per area, the Marketplace operation by
  operation, and every status the tests check that the contract does not document. It reads the test list, so
  it runs no tests. With the app up it first compares the contract with the live `/schema/openapi.json` and
  stops on any difference; `npm run coverage:api -- --update-contract` refreshes the file after an app update.
  CI writes the report to the run's summary page.
- In CI, on the run's summary page: the counts of passed, failed, flaky and skipped tests, then every failed
  and flaky test with the first line of its error (`src/reporters/step-summary.ts`), so the result reads
  without downloading anything.
- In CI, as a web page: a full-suite run (push to `main`, nightly, manual) publishes its HTML report on the
  repository's GitHub Pages site, with screenshots, videos and traces that open in the browser. Each run has
  its own address, `runs/<run number>/`, linked from the run's summary page; the site's root redirects to the
  newest report and `runs/` lists the ones kept. The newest 20 are kept, and a failed run publishes too. The
  reports live on the `gh-pages` branch, which `scripts/publish-report.sh` rewrites as one commit each time, so
  dropped reports do not stay in the repository. Pull requests do not publish: a fork gets no permission to.
- In CI, as files: the HTML report and `reports/` (JUnit XML and the app's container log) are uploaded as
  workflow artifacts on every run and kept for 7 days. A pull request's full report is this artifact.
- Traces, videos and the HTML report record the throwaway users' tokens and passwords. The values only work on
  that run's app instance, which is gone when the CI job ends, so the public Pages site exposes nothing usable.
  The artifacts are never committed.

## CI

GitHub Actions (`.github/workflows/tests.yml`) runs `npm run check`, starts the app in Docker and runs the tests
with the `ci` profile. A second job, `report`, publishes a full-suite run's HTML report to the `gh-pages` branch
(the repository's Pages source must be that branch). How many tests depends on the trigger:

| Trigger                     | Tests                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| pull request                | the `@smoke` files plus the test files the change touches (`scripts/pr-tests.sh`) |
| push to `main`              | the full suite                                                                    |
| nightly (03:00 UTC), manual | the full suite                                                                    |

"Touches" follows imports: a change in `src/` runs every test file that uses the changed code, and a
documentation-only change runs only the smoke tests. A change Playwright cannot follow (`playwright.config.ts`,
global setup, `src/config/`, dependencies, `compose.yaml`, the workflow) runs the full suite. A selected `@ledger`
test also runs the whole `api` and `ui` projects: its project waits for them, and Playwright runs a project it
waits for in full. To see what a branch would run: `DRY_RUN=1 scripts/pr-tests.sh origin/main`.

