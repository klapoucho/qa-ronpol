# Framework requirements

Extended requirements for the Rolnopol test automation framework. They turn the
[original task](requirements-original.md) (Polish) into concrete, testable decisions that the
plan, the code and the commits can refer to.

- **Status:** draft for approval
- **Date:** 2026-11-25
- **Applies to:** Rolnopol **1.126.0** (Docker image `jaktestowac/rolnopol:1.126.0`)
- **Deadline for the first delivery:** 2026-11-26. Agent budget: not fixed, kept reasonable.

## 1. Summary

We build a Playwright + TypeScript framework for [Rolnopol](https://github.com/jaktestowac/rolnopol)
that is meant to grow, not just to hold five tests.

- **One feature, every level.** We treat the **Marketplace** as if it were a new feature handed
  to QA and test it on three levels: API, UI against the real backend, and UI against a mocked
  API. The first delivery is **5 tests** (section 5). The structure and conventions are built
  for many more features (section 8).
- **Current tooling.** Node.js 26 LTS, Playwright 1.65, TypeScript 6.0, native ES modules
  targeting ES2025 (section 7.1).
- **Isolated, parallel tests.** Every test creates its own users and data through the API, so
  tests run in parallel with no shared state and no database resets between them.
- **AI-assisted, in the open.** The implementation plan builds the framework and the `qa-pick`
  workflow, not the tests. Each of the five test cases is a GitHub issue; the author runs
  `/qa-pick <issue>` (manual QA by an agent, review, then a test writer and a test reviewer). Its
  reports are committed as evidence of the process (section 10).

## 2. Context and intent

The task is a recruitment exercise. Reviewers judge the architecture, code quality, practices,
maintainability and the approach to the problem, not only the result. This document serves two
readers:

- **Reviewers.** Sections 1–5 explain what we test and why in a few minutes of reading.
- **Builders (people and agents).** Requirements carry IDs (`FR-xx`, `NFR-xx`, `D-xx`) with
  acceptance criteria. The plan, commits and PRs reference these IDs.

How to read requirement IDs:

| Prefix | Meaning |
| ------ | ------- |
| `FR`   | functional requirement of the framework |
| `NFR`  | non-functional requirement (quality, tooling, performance) |
| `AC`   | acceptance criterion of the Marketplace feature (the system under test) |
| `T`    | one of the first five tests |
| `D`    | a recorded decision, with the alternatives considered |

Items marked **(our call)** are proposals made while writing this document, not requirements
from the task. They can be changed through a PR to this file.

## 3. Goals, non-goals, anti-goals

### Goals

- **G1.** Cover every item of the original task: framework (structure, abstraction layer,
  environment config, test data, reporting), 5 tests (UI, API, frontend on mocks), quality
  tooling, documentation, CI-ready runs.
- **G2.** Cover all three bonus items: parallel execution, data mocking, test data management.
- **G3.** Adding a feature or a test means adding files in known places. It never means
  restructuring folders, configs or shared code.
- **G4.** A third party can clone the repo and run the tests by following the README.
- **G5.** The commit history tells the story of the work, step by step.

### Non-goals (for the first delivery)

- Testing Rolnopol areas outside the Marketplace: farm resources, finance screens, admin, chaos
  engine, feature flags, GraphQL, WebSockets, gRPC, 2FA, AI assistants.
- Cross-browser runs. Chromium only; other browsers are a config change (section 13).
- Visual regression, performance, accessibility audits.
- Allure or other external reporting stacks.

### Anti-goals (failure even if the tests pass)

- Tests that pass while the feature is broken: assertions that cannot fail, broad locators,
  mocks that drift from the real API.
- Tests that depend on each other, on run order or on the shared demo accounts.
- Fixed waits (`waitForTimeout`) and retries used to hide flakiness.
- A framework that is only an elaborate wrapper: every abstraction must remove duplication or
  make a test easier to read.
- Hidden AI use or generated code nobody reviewed.

## 4. System under test

### 4.1 Rolnopol

A farm management app built for test automation practice: Express.js, a JSON-file database,
static HTML/JS frontend, REST API with Swagger (`/swagger.html`, `/schema/openapi.json`). It
contains **intentional bugs**. Most of its 59 screens are behind feature flags that are off by
default. The core that is on by default: account (register, login, profile), farm resources
(fields, staff, animals, assignments), finance (balance, transactions, transfers) and the
Marketplace.

Facts the framework relies on (checked on 1.127.0, commit `02751a9`; compared with 1.126.0,
commit `fb7fd89`, only dependencies and the OpenAPI version string differ):

| Fact | Consequence |
| ---- | ----------- |
| API base is `/api/v1`. Most responses use an envelope `{ success, timestamp, data \| error }`. Exceptions: `GET /api/v1/statistics` returns a bare object (the frontend reads `totalValue` directly), and `GET /api/version` (outside `/api/v1`) returns `{ version }`. | API clients unwrap the envelope in one place. Schemas, clients and mocks follow each endpoint's real wire format, so the exceptions keep their bare shape. |
| `POST /api/v1/register` returns a token. A new user starts with balance 0 ROL and can add income through `POST /api/v1/financial/transactions`. | Tests create and fund their own users. No demo accounts. |
| `GET /api/v1/healthcheck` and `GET /api/v1/about` (returns `version`). | Global setup checks the app is up and is the expected version. |
| `POST /api/debug/database/restore-base` (outside `/api/v1`, no login needed) restores the whole DB. | Used only on request, never between tests (D-05). |
| Browse loads all active offers in one response and paginates in the browser. | Pagination is a frontend concern: T5 covers it on mocks; T4 must find its offer on any page. |
| The frontend treats a user as logged in when the cookies `rolnopolToken` and `rolnopolIsLogged` exist. Login also sets `rolnopolUserId`, `rolnopolUserLabel` and `rolnopolLoginTime`. On page load the frontend calls `GET /api/v1/authorization` to check the token. | UI tests log in by setting the same cookies from an API token. Mocked UI tests use fake cookies plus a successful `authorization` mock. |
| Every page load calls shared endpoints: `authorization`, `feature-flags` and `/api/version`. The Marketplace page adds `financial/account`, `financial/stats`, `financial/marketplace-stats`, `fields`, `animals`, `marketplace/offers`, `marketplace/my-offers`, `marketplace/transactions` and `statistics` on load, and `marketplace/offers` (POST), `marketplace/buy`, `marketplace/offers/{id}` (DELETE) on user actions. (Captured from the browser's network log.) | The mock layer covers the shared set for every page and the feature set per page; the guard catches anything else. |
| Most `/api/v1` routes (Marketplace, finance, fields, users, `authorization`, `feature-flags`) share one limit of 100 requests per 30 s per IP, answered with 429. A request whose `X-Synthetic-Token` header matches the app's `SYNTHETIC_TOKEN` skips that limit (the `syntheticMonitoringEnabled` flag is on in 1.126.0); the login and register limits still apply. | Parallel workers, stability runs and agents share one IP. Compose starts the app with `SYNTHETIC_TOKEN`, every request context sends it, and global setup stops the run if the app does not verify it (D-16). |
| The Marketplace page has `data-testid` only on the confirmation modal. | Locators fall back to role and label (FR-14); missing test ids are recorded as findings. |

### 4.2 Marketplace: the feature we test

Users sell fields and animals they own to other users for ROL, the in-app currency. Screens:
browse offers (with type filter and 9/18/36 per page), my offers, create offer, transaction
history.

The acceptance criteria below were read from the source code and the running app. They are the
input for the `qa-pick` runs, which confirm or correct them. Anything the runs find that differs
from them becomes a bug report, not a silent change to the tests.

- **AC-1 Create offer.** A logged-in user can offer a field or an animal group they own for a
  price greater than 0. The description is optional, at most 300 characters, letters (including
  Polish), digits, `_`, whitespace and `. , ; : ! ( ) -` only. Invalid input is refused with 400 and a
  message naming the problem. An item the user does not own is refused with 404.
- **AC-2 One active offer per item.** An item that already has an active offer cannot be
  offered again (400).
- **AC-3 Visibility.** Browse shows the active offers of other users, not the user's own. My
  Offers shows the user's own offers.
- **AC-4 Buy.** A user can buy another user's active offer when their balance covers the price.
  No overdraft: a balance below the price is refused with 400 and nothing changes.
- **AC-5 Effects of a sale.** After a purchase: the buyer's balance drops by the price, the
  seller's rises by the price, the item belongs to the buyer, the offer is no longer active,
  and the sale appears in both users' marketplace and financial history.
- **AC-6 Own offer.** A user cannot buy their own offer (400).
- **AC-7 Cancel.** Only the seller can cancel an active offer. Another user gets 403. A
  cancelled offer disappears from browse and cannot be bought.
- **AC-8 Browse states.** The browse list paginates and filters by item type, shows an empty
  state when there are no offers, and shows a readable error when the API fails, without
  breaking the page. (Empty and error behaviour is not confirmed yet; the first `qa-pick` run
  establishes it.)

## 5. First delivery: five tests

Each `T` is one spec covering one business scenario. A parametrized spec counts as one `T`, and
its cases live in a separate params file (FR-09). Each `T` is published as a GitHub issue, which
is the input for its `qa-pick` run (section 10).

| ID | Level | Scenario | Covers | What it shows |
| -- | ----- | -------- | ------ | ------------- |
| **T1** | API | **Sale between two users.** Seller with a field lists it; funded buyer buys it. Assert both balances, the field's new owner, the offer status, and the history of both users. | AC-4, AC-5 | Two actors, cross-domain checks (marketplace, finance, fields), factories and API clients |
| **T2** | API | **Business rules (parametrized).** Invalid price, invalid or too long description, item already offered, item not owned, own offer, insufficient funds, cancelling another user's offer. Each case asserts status, message and that balances and offers did not change. | AC-1, AC-2, AC-4, AC-6, AC-7 | Data-driven tests, negative paths, state checks after refusals |
| **T3** | UI | **Seller lists an item.** User with a field (seeded through the API, logged in through cookies) creates an offer in the UI. Assert the success message and the offer in My Offers; assert through the API that another user can see it. | AC-1, AC-3 | Page objects, API-seeded preconditions, UI action only where the UI matters |
| **T4** | UI | **Buyer buys an offer.** Offer seeded through the API; funded buyer buys it in Browse and confirms in the modal. Assert the balance shown, the offer gone from Browse, the entry in transaction history. | AC-4, AC-5 | Full user path on the real backend |
| **T5** | UI on mocks | **Browse renders API data (parametrized).** Mocked API returns: a page of offers, several pages, no offers, a 500 error. Assert cards (type, price, seller, item details), pagination, the empty state, the error message. | AC-3, AC-8 | Frontend logic without a backend, deterministic data, mock layer and network guard |

**Test size rule (NFR-11):** one business behaviour per test, together with its outcome. No
fixed step or assertion counts: a test that needs a second behaviour is split, and many fields
of one object are checked by one assertion (FR-20).

## 6. Functional requirements

### Structure and layers

- **FR-01 Layers.** Framework code lives in `src/`, tests in `tests/`, config at the root and in
  `src/config/`. Tests contain scenario steps and assertions only: no raw HTTP calls, raw
  selectors, or data literals that belong in factories or params files.
- **FR-02 API clients.** One client class per API resource (`MarketplaceApi`, `FinancialApi`,
  `FieldsApi`, `AnimalsApi`, `AuthApi`, …) built on Playwright's `APIRequestContext`. Clients
  unwrap the response envelope where the endpoint uses one (4.1), return typed data, and expose
  the status and error message, so negative tests can assert them without try/catch.
- **FR-03 Models and schemas.** Request and response types live in `src/api/models/` as zod
  schemas with inferred TypeScript types. API tests validate responses against them. Mock
  payloads are built from the same types, so a contract change breaks compilation or validation
  instead of letting a mock drift (D-08).
- **FR-04 Page objects.** One class per screen in `src/ui/pages/`. Repeated parts (offer card,
  pagination, confirmation modal, nav bar, toast) are components in `src/ui/components/`. Page
  objects expose user actions and locators, not assertions. Assertions stay in tests. The same
  page objects serve `ui` and `ui-mocked` tests.
- **FR-05 Fixtures.** Playwright fixtures in `src/fixtures/` provide configured API clients,
  factories, logged-in pages and the mock helpers. Tests import `test` and `expect` from the
  fixtures entry point, never from `@playwright/test` directly.

### Configuration and environments

- **FR-06 Configuration.** All settings come from environment variables, optionally loaded from
  a `.env` file, and are validated by a zod schema at startup. Invalid or missing values stop
  the run with a message naming the variable. `.env.example` lists every variable with its
  default. Minimum set: `BASE_URL` (default `http://localhost:3000`), `TEST_ENV`
  (`local` | `ci`), `EXPECTED_APP_VERSION` (default `1.126.0`), `RESET_DB` (default `false`).
- **FR-07 Environments.** `TEST_ENV` selects a profile with defaults for retries, workers,
  reporters and timeouts. Adding an environment such as `staging` means adding one profile and
  setting `BASE_URL`, with no change to tests.
- **FR-08 App check.** Global setup calls `/api/v1/healthcheck` and `/api/v1/about`. If the app
  is unreachable it stops with the command that starts it (section 9). If the version differs
  from `EXPECTED_APP_VERSION` it logs a warning and continues.

### Test data

- **FR-09 Params files.** Cases of a parametrized test live next to the spec in
  `<name>.params.ts`, as a typed, exported array. Each case has a readable title, used in the
  test name. TypeScript, not JSON, so cases are type-checked and can use factories (D-07).
- **FR-10 Factories.** `src/data/factories/` builds valid entities with unique values (faker plus
  a run-unique suffix): users, fields, animals, offers. Tests override only the fields that
  matter to the scenario.
- **FR-11 Seeding through the API.** Fixtures create the users and data each test needs through
  the API, for example `seller` with a field, or `buyer` funded with an amount. Seeding errors
  throw with a clear message, so a broken seed never looks like an expected failure.
- **FR-12 Isolation.** No test uses the demo accounts or data created by another test. Tests do
  not delete what they create: data is unique per test, and `RESET_DB=true` restores the base
  DB once in global setup, before any worker starts (D-05).

### Auth, mocking, locators

- **FR-13 Login without the UI.** UI tests get a logged-in page by registering or logging in
  through the API and setting the cookies the login page sets (4.1).
- **FR-14 Locators.** Use `getByTestId` where a test id exists; otherwise `getByRole` with a
  name, then `getByLabel`, then `getByText`. CSS only as a documented last resort, never
  nth-index. Scope to a container (card, row, modal) before asserting. This follows
  `testing-rules/ui.md` from `qa-pick`.
- **FR-15 Mock layer.** `src/mocks/` provides route handlers and payload builders in two
  groups: **shared** handlers for the requests every page makes on load (`authorization` with a
  successful response, `feature-flags`, `/api/version`), installed for every `ui-mocked` test,
  and **feature** handlers per page (for the Marketplace, the endpoints in 4.1). Payloads keep
  each endpoint's real wire format, including the bare responses. In the `ui-mocked` project a
  guard fails the test on any `/api/` request that no handler served, so nothing reaches the
  real backend by accident.

### Running and reporting

- **FR-16 Playwright projects.** `api` (no browser), `ui` (Chromium, real backend), `ui-mocked`
  (Chromium, mocked API, network guard) and `ui-ledger` (the `@ledger` tests of `tests/ui/`, one
  worker, after `api` and `ui`; D-19). Each other project maps to one folder under `tests/`.
- **FR-17 Tags.** `@smoke` for the minimal set that proves the app works, `@critical` for
  money-moving paths and `@ledger` for a UI test that moves money through the page (it runs in
  `ui-ledger`, D-19). Projects already express the test level, so tags never repeat it. A test
  hitting a known app bug is marked `test.fail()` with an annotation linking the bug file
  (D-06).
- **FR-18 npm scripts.** `test`, `test:api`, `test:ui`, `test:ui-mocked`, `test:ui-ledger`, `test:smoke`,
  `report`, `coverage:api` (FR-21), `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `check` (typecheck +
  lint + format check + `playwright test --list`), and the app scripts in section 9.
- **FR-19 Reporting.** The built-in HTML report always. Locally the `list` reporter; in CI
  `github`, `html` and `junit`. Trace on first retry, screenshot on failure, video kept on
  failure. Every test has a title stating the expected behaviour and uses `test.step` for its
  main stages, so the report reads as a scenario.

### Assertions

- **FR-20 Domain assertions.** When a UI check covers many fields or several sources (an offer
  card, a filled form), it is one custom matcher registered with Playwright's `expect.extend`, for example
  `await expect(page.offerCard(id)).toShowOffer(offer)`. Matchers live in `src/assertions/` and
  are exported through the fixtures entry point. Each matcher:
  - reports **every** mismatching field in one failure message, not only the first one;
  - retries until its timeout when it reads the UI, like the built-in web-first assertions;
  - is used only where a built-in matcher does not fit: for plain API data, `toEqual` or
    `toMatchObject` on the whole object is already one assertion. An API check across several
    sources (a settled sale across balances, ownership and history) is a fixture that reads them
    into one plain object, compared with one `toEqual` (`readSale` in
    `src/fixtures/marketplace.fixtures.ts`).

### API contract coverage

- **FR-21 Coverage against the OpenAPI.** API tests of one endpoint's responses sit in a
  `test.describe` titled `<METHOD> <path>`, the path as the app serves it with the OpenAPI
  parameters kept (`DELETE /api/v1/marketplace/offers/{offerId}`), and inside it one
  `test.describe` per status code, ascending. Scenarios that chain several calls stay outside
  these groups. `npm run coverage:api` (`scripts/api-coverage.ts`) reads the groups from
  `playwright test --list` and reports, against the contract in `docs/api/openapi.json`:
  operations with a test, documented responses with a test, both per area (OpenAPI tag), and the
  tested statuses and operations the contract does not document. It never runs a test.
  - **Fresh contract first.** When the app is reachable, the script compares the checked-in
    contract with the live `/schema/openapi.json` (operations and documented statuses) and fails
    on any difference, so a stale file never becomes the denominator. `--update-contract`
    refreshes it after an app update.
  - **Contract gaps are findings.** A status or operation the tests prove but the contract does
    not document is filed as a `contract` bug
    (`.claude/skills/testing-rules/api.md`); the test keeps asserting the live
    behaviour when that behaviour is right.
  - CI writes the report to the run's summary page.

## 7. Non-functional requirements

### 7.1 Tooling and versions

Versions checked on 2026-11-25 against the npm registry and nodejs.org (appendix A).

- **NFR-01 Node.js 26 LTS** ("Lithium", currently 26.13.x), pinned in `.nvmrc` and
  `package.json` `engines`. Playwright supports Node 22, 24 and 26. The app runs in its own
  container, so its Node version does not constrain ours.
- **NFR-02 Playwright `@playwright/test` 1.65.x**, the latest stable release. No alpha or beta
  builds.
- **NFR-03 TypeScript 6.0.x, not 7.0.** TypeScript 7.0.2 is the latest, but `typescript-eslint`
  8.74 supports only TypeScript below 6.1. We pick the newest version all tools support, and
  move to 7.x when `typescript-eslint` does (D-02).
- **NFR-04 ECMAScript.** Native ES modules (`"type": "module"`), `tsconfig` extending
  `@tsconfig/node26`: `target` and `lib` ES2025, `module` `nodenext`. On top: `strict`,
  `noUncheckedIndexedAccess`, `noEmit`. Playwright compiles TypeScript itself; `tsc --noEmit`
  is the type check.
- **NFR-05 Imports.** No deep relative chains (`../../../src/...`). Use an alias mechanism that
  both `tsc` and Playwright resolve, checked in a spike before the first framework code (left to
  the builder: `package.json` `imports` subpaths, or `tsconfig` `paths`).
- **NFR-06 Dependencies.** npm with a committed `package-lock.json`, `npm ci` everywhere, exact
  versions (`save-exact`). Configuration from `.env` uses Node's built-in loader, not `dotenv`
  (our call: one less dependency).

### 7.2 Code quality

- **NFR-07 Lint.** ESLint flat config with `typescript-eslint` (type-aware, including
  `no-floating-promises`) and `eslint-plugin-playwright` (recommended rules, `no-wait-for-timeout`
  as an error). Biome was considered and rejected (D-03).
- **NFR-08 Format.** Prettier, checked in CI and on commit.
- **NFR-09 Git hooks.** Husky with lint-staged (lint and format staged files) and commitlint
  enforcing the Conventional Commits rules of `CONTRIBUTING.md`.
- **NFR-10 Every commit works.** Each commit passes `npm run check`. This follows the rebase
  merge rule in `CONTRIBUTING.md`.

### 7.3 Tests

- **NFR-11 Size.** One business behaviour per test, with its outcome, readable as a scenario. No
  fixed step or assertion counts. A test that needs a second behaviour is split. Many fields of
  one object are one assertion (FR-20). Fewer assertions never means fewer checks: NFR-12 still
  applies to every field a matcher covers. A test running longer than about 15 s is a signal to
  review it, not a hard limit.
- **NFR-12 Assertions that can fail.** Each new test goes through the poison-test protocol of
  `testing-rules/general.md`: a wrong expected value and a partly broken scenario must both make
  it fail.
- **NFR-13 No fixed waits.** Use web-first assertions and `waitForResponse`, never
  `waitForTimeout`.
- **NFR-14 Parallel.** `fullyParallel: true`. The suite passes with any worker count and in any
  order, except the `@ledger` tests: the app queues every money operation behind one lock and its
  pages give up on a request after 15 s, so they run alone in `ui-ledger` (D-19).
- **NFR-15 Retries.** None locally; one in CI. A test that passes only on retry is reported as
  flaky and fixed, not accepted.
- **NFR-16 Runtime.** The full suite runs in under 2 minutes in CI.

### 7.4 Scalability

- **NFR-17 The layout absorbs growth.** The folder layout and the layers are designed for the
  full app, not for the first five tests. A new feature gets its own folders
  (`tests/{api,ui,ui-mocked}/<feature>/`) and its own clients, pages, components, factories,
  mocks and assertions in `src/`. It never requires moving existing tests or reorganising the
  layout. Existing tests and shared code do change when the feature changes their behaviour, or
  when a refactor removes duplication; that is normal maintenance.
- **NFR-18 Adding an environment or browser** is a config change (FR-07, FR-16).
- **NFR-19 Conventions are written down.** [docs/writing-tests.md](writing-tests.md) has the
  naming rules and a checklist for a new test or feature; the README links to it.

### 7.5 Security and portability

- **NFR-20 No secrets in the repo.** Tests need none: users are created per run. `.env` is
  ignored; `.env.example` is committed. Committed files, `.qa/` reports and test or step
  titles never contain tokens or passwords.
  Test artifacts are the one exception. Traces, videos and the HTML report (FR-19) record the
  requests a test makes, so they hold the tokens, cookies and passwords of the throwaway users
  that test created. These values work only against the app instance the run used: in CI that
  container is gone when the job ends. Artifacts are therefore never committed, and CI keeps
  them for 7 days. Redacting traces was considered and rejected: it means rewriting Playwright's
  trace archives after every run, which breaks when their format changes.
- **NFR-21 Third-party run.** A clean machine with Node 26 and Docker runs the suite with
  `npm ci`, `npx playwright install --with-deps chromium`, `npm run app:up`, `npm test`.

## 8. Project structure

Type of test first, then feature (D-04). Each top-level test folder is one Playwright project; the
exception is `ui-ledger`, which runs the `@ledger` tests of `tests/ui/` alone (D-19).

```text
.
├── .claude/skills/            # qa-pick workflow skills (section 10)
├── .github/workflows/         # CI
├── .qa/                       # qa-pick runs, bug files, lessons (committed)
├── docs/                      # requirements, decisions, plans
├── src/
│   ├── api/
│   │   ├── clients/           # MarketplaceApi, FinancialApi, FieldsApi, AnimalsApi, AuthApi
│   │   └── models/            # zod schemas + inferred types
│   ├── ui/
│   │   ├── pages/             # MarketplacePage, …
│   │   └── components/        # OfferCard, Pagination, ConfirmationModal, Toast, NavBar
│   ├── assertions/            # custom matchers (expect.extend)
│   ├── mocks/                 # route handlers, payload builders, network guard
│   ├── data/factories/        # user, field, animal, offer factories
│   ├── fixtures/              # Playwright fixtures; exports test and expect
│   └── config/                # env schema, profiles, loader
├── tests/
│   ├── api/marketplace/       # sale.spec.ts, rules.spec.ts + rules.params.ts
│   ├── ui/marketplace/        # sell-offer.spec.ts, buy-offer.spec.ts
│   ├── ui-mocked/marketplace/ # browse.spec.ts + browse.params.ts
│   └── global-setup.ts
├── compose.yaml               # Rolnopol 1.126.0 container
├── playwright.config.ts
├── eslint.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

Why this layout:

- **API clients per resource** (`MarketplaceApi`), not per HTTP method: one class holds every
  call for a resource, which types well and reads like the domain.
- **Locators live in the page or component that owns them**, not in separate locator files, so
  a screen change touches one class.
- **Playwright fixtures** provide clients, users and pages, so tests never build their own setup.
- **Configuration from environment variables**, validated at startup, so CI and other
  environments override it without new files.
- **No folders per endpoint, method, role or positive/negative.** Playwright projects already
  separate the test levels; role and positive/negative belong in test titles, tags and
  parametrized cases. Inside an API spec, describe blocks group the tests by operation and
  status (FR-21), which the HTML report and the coverage script read. Extra folder levels would
  repeat that information and make tests harder to find.

**Naming.** Files in kebab-case; specs `*.spec.ts`; params `*.params.ts`; classes in PascalCase
named after the screen or resource (`MarketplacePage`, `MarketplaceApi`). Test titles describe
behaviour: `buyer cannot buy an offer above their balance`.

## 9. Running the app under test

The framework does not start the app: tests run against `BASE_URL` (D-01). For local runs and
CI the repo ships setup for the pinned Docker image:

- `compose.yaml` runs `jaktestowac/rolnopol:1.126.0` on port 3000, with a healthcheck on
  `/api/v1/healthcheck`.
- npm scripts: `app:up` (start and wait until healthy), `app:down`, `app:logs`, `app:reset`
  (call `restore-base`).
- **Docker is the way to run the app, locally and in CI.** It is a prerequisite: it must be
  installed on the author's machine before the framework core (section 10, step 3), so
  `compose.yaml` and the `app:*` scripts are verified locally, not only in CI.
- CI starts the same container with `npm run app:up` before the tests.
- On pull requests CI runs the `@smoke` files plus the test files the change touches; `main`, a
  nightly run and manual runs run the full suite (D-17, `scripts/pr-tests.sh`).
- [docs/app-under-test.md](app-under-test.md) also describes the fallback for people without Docker: a local clone of Rolnopol
  started with `npm start`, with the note that the tests target 1.126.0 and that a running clone
  writes to its tracked `data/*.json` files.
- **Who may start and reset the app.** Agents (including `qa-pick` agents) may start it with
  `npm run app:up` when it is not running. They may not stop or reset it (`app:down`,
  `app:reset`, `RESET_DB=true`): a reset wipes data that a parallel run depends on. Only the
  author resets the app.

## 10. AI-assisted workflow (`qa-pick`)

Tests are written through the `qa-pick` workflow from the `qa-pick-portable` repository: a QA
tester agent tests the story manually (UI through the Playwright CLI, API over HTTP), a fresh
reviewer checks coverage and tries to break the feature, a test writer automates the handoff on
its own branch (including a `--repeat-each=10` stability run), and a fresh test reviewer reviews
each test. Pushes and PRs always wait for the author's approval.

### Two phases

**Phase A: the implementation plan.** It builds everything `qa-pick` needs, and **no
Marketplace tests**:

1. This document.
2. Tooling skeleton: package, TypeScript, ESLint, Prettier, hooks, commitlint.
3. Framework core: config, global setup, fixtures, API client base, auth, factories, assertion
   and mock infrastructure with the network guard, Docker scripts. Each Playwright project gets
   one minimal wiring check (for example the healthcheck through the API client, a page load
   for `ui`, a mocked page load for `ui-mocked`). These are framework checks, not tests of
   T1–T5.
4. CI workflow.
5. `qa-pick` installation and adaptation (below).
6. The five test cases T1–T5 published as GitHub issues in `klapoucho/qa-ronpol` (below).
7. README with decisions, structure, run instructions, assumptions and limits, and how to run
   `/qa-pick <issue>`.

**Phase B: the author's QA runs, outside the plan.** The author runs `/qa-pick <issue number>`
for each issue. The coordinator reads the issue, assigns the author if not assigned yet, sets
the issue's status to In progress, and runs the pipeline. When the run ends it sets In review;
the author closes the issue after reading the results, so test PRs reference it with `Refs #N`,
not `Closes #N`. The test writer adds the feature-specific clients, pages, components,
factories, assertions and mocks the test needs, following section 8. Phase A must not write
these Marketplace parts in advance.

### Test cases as GitHub issues

Each `T` from section 5 becomes one issue, so `qa-pick` takes it by number, and reviewers see the
work tracked like a real backlog:

- **Title:** the scenario, e.g. `Marketplace: sale between two users (API)`.
- **Body:** a short user story, the feature context from 4.2, the acceptance criteria it covers
  (copied, not referenced), the test level and what the test must prove (the "What it shows"
  column), and a link to this document.
- **Labels:** `marketplace`, the level (`api`, `ui`, `ui-mocked`) and `test-case`.
- Creating the issues and labels is a GitHub write: the plan prepares their text in the repo,
  and the author approves before they are created.

### GitHub CLI

`/qa-pick <number>` needs the GitHub CLI:

- `gh` installed, version 2.99 or later (the Playwright CLI skill uses `--attach`).
- Logged in as **`klapoucho`** with access to `klapoucho/qa-ronpol`. Another GitHub account is
  also logged in on the author's machine, so `gh api user --jq .login` must print `klapoucho`
  before **every** `gh` command, reads included (as `CLAUDE.md` requires). On a mismatch, stop
  and ask the author; the fix is `gh auth switch -u klapoucho`. The `qa-pick` coordinator runs
  this check before its first `gh` call, not only before assigning.
- CI does not need `gh`; GitHub Actions uses its own token.

### Required adaptations before the first run

- Copy the skills to `.claude/skills/` and commit them, so reviewers can read the workflow.
- Add the **QA settings** section to `CLAUDE.md`: app URL, API base `/api/v1`, start command
  `npm run app:up` (agents may start the app, never stop or reset it; section 9), how to create a
  user (`POST /api/v1/register`), framework and test folders, install `npm ci`, gate
  `npm run typecheck`, `npx eslint <files>`, `npx playwright test --list <files>`, main branch
  `main`, issue repository `klapoucho/qa-ronpol`, GitHub account `klapoucho`, app repository
  `jaktestowac/rolnopol`.
- Move the `qa-pick` coordinator's account check (`gh api user --jq .login`) before its first
  `gh` read of the issue. The skill currently checks only before assigning.
- Add the self-assignment exception to the rules in `CLAUDE.md`: `/qa-pick` may add the
  `klapoucho` account as assignee of the issue it tests without asking. Every other GitHub write
  still needs approval.
- **`.qa/` is committed, not ignored** (D-09). The skills assume it is ignored and pass absolute
  paths for that reason; that still works. Decide in the plan which branch carries each run's
  folder (with its test branch, or its own `docs/` branch).
- **Skill names.** Claude Code runs a user-level skill over a project skill with the same name.
  The author had user-level skills named `qa-pick` and `qa-review` (another version); they were
  renamed on 2026-11-25, so the project copies keep their names. Before the first run, confirm
  that `/qa-pick` in this repo loads the project copy.
- Install the Playwright CLI the skills use (`@playwright/cli`) at a version checked at
  install time.
- `.claude/worktrees/` and `.playwright-cli/` are ignored. So is `.qa/runs/*/scratch/`
  **(our call)**: it holds seed state with live tokens, which NFR-20 keeps out of the repo.
  Everything else in `.qa/` is committed.

**Attribution.** As `CONTRIBUTING.md` requires: agent commits carry a `Co-Authored-By:` trailer
and agent PRs a "Generated with Claude Code" line.

## 11. Definition of done

A test is done when:

- it maps to a `T` and its `AC`s and follows NFR-11;
- it passed the deterministic gate (`npm run check`) and the poison-test protocol (NFR-12);
- a fresh-context test review answered the questions in `testing-rules/general.md`, and its
  findings are fixed or listed in the PR;
- it passes 10 times in a row with `--repeat-each=10` and with full parallelism;
- the PR has the test intent card from `testing-rules/general.md`.

**Phase A (the plan) is done** when `npm run check` and the wiring checks pass locally and in CI
against the Docker app, `qa-pick` is installed and adapted, the five issues exist, and the README
covers the four items the task asks for.

**The first delivery is done** when the author's `qa-pick` runs have produced T1–T5 meeting the
test criteria above, merged with CI green on `main`.

## 12. Decisions

| ID | Decision | Alternatives considered | Why |
| -- | -------- | ----------------------- | --- |
| D-01 | The framework runs against `BASE_URL` and does not start the app. Docker setup for 1.126.0 is provided. | Playwright `webServer` starting a pinned clone; Docker only | Author's choice: keep the framework independent of how the app is hosted. The Docker image pins the version and isolates the app's Node version. |
| D-02 | TypeScript 6.0.x | TypeScript 7.0 | `typescript-eslint` does not support 7.x yet |
| D-03 | ESLint + Prettier | Biome | Biome has no Playwright rules; a missing `await` before `expect` is the most common Playwright bug |
| D-04 | `tests/<type>/<feature>/` | `tests/<feature>/<type>/`; deeper endpoint/method/role folders | Type maps 1:1 to Playwright projects (different browser, auth and network setup), and CI can run one type alone |
| D-05 | Per-test data through the API; DB reset only on request in global setup | Reset before every test; shared demo data | Resets between tests break parallel runs; shared data couples tests |
| D-06 | Known app bugs: `test.fail()` with a link to the bug file | Leave the test red; skip it | Suite stays green while the bug stays visible; Playwright flags the test when the bug is fixed |
| D-07 | Params in typed `.params.ts` files | JSON files | Type checking, factories, editor hints. JSON only if non-developers edit cases |
| D-08 | zod schemas shared by API tests and mocks | Hand-written mocks; generated types from OpenAPI | Prevents mock drift with few dependencies. Generating from OpenAPI is worth it once many endpoints are covered (section 13) |
| D-09 | `.qa/` committed, except `runs/*/scratch/` | Ignored | Shows reviewers the QA process behind each test; scratch holds tokens |
| D-10 | Marketplace as the single feature | Several areas, one test each | One coherent story across levels; the feature touches finance and farm resources, which limits the narrower coverage |
| D-11 | Mocked UI tests in `tests/ui-mocked/`, own project | Inside `tests/ui/` with a tag; `tests/integration/` | Different contract and setup (fake auth, network guard); "integration" is ambiguous |
| D-12 | The plan builds the framework and `qa-pick` setup only; T1–T5 are five GitHub issues the author runs through `/qa-pick` | The plan writes the tests; one `qa-pick` story for the whole Marketplace | The author drives the QA runs; issues give `qa-pick` a stable input and show a tracked backlog |
| D-13 | Docker locally and in CI; agents may start the app, only the author resets it | Local clone as the dev backend; agents free to reset | Same app version everywhere; a reset during a run destroys its data |
| D-14 | Import alias: `package.json` `imports` (`#src/*`), imports written with the `.ts` extension | `tsconfig` `paths` (`@src/*`) | Spike: `tsc --noEmit`, Playwright and plain Node all resolved `#src/spike.ts`; no second mechanism needed |
| D-15 | A run's folder (without `scratch/`) and its bug files are committed on the run's test branch, in one `docs(qa): add qa-pick run <run-id>` commit; a run with no test branch (automation skipped, BLOCKED) uses `docs/qa-run-<slug>`; lessons go with the retro's skill-edit branch | A separate `docs/` branch per run; leaving `.qa/` uncommitted until later | The evidence reaches `main` in the same PR as the tests it explains |
| D-16 | Test traffic sends `X-Synthetic-Token`; compose starts the app with the matching `SYNTHETIC_TOKEN` (a local, non-secret default) | `NODE_ENV=test` in compose; fewer workers | The app's own exemption for automated checks lifts only the API rate limit. `NODE_ENV=test` also skips the feature-flag overrides and changes DB writes, so the tests would run against a different app |
| D-17 | Pull requests run the `@smoke` files plus the test files the change touches (`--only-changed`, which follows imports); a change Playwright cannot follow (config, global setup, dependencies, `compose.yaml`, CI) runs the full suite; `main`, a nightly run and manual runs always run the full suite | The full suite on every pull request; smoke only on pull requests | Pull-request runs stay short as the suite grows, without merging untested changes to the code a test uses. Anything a pull request skips is covered on `main` the same day. Sharding comes next if the full suite outgrows NFR-16 |
| D-18 | API specs group tests in describe blocks by operation (`<METHOD> <path>`), then status; `scripts/api-coverage.ts` measures coverage from `playwright test --list` against a checked-in OpenAPI that it first compares with the live one (FR-21) | One spec file per operation; per-test annotations; an OpenAPI coverage tool that records live traffic | Shows what is untested and where the docs and the app disagree, not only how many tests pass. Describe blocks fit the planned scenario and params files and read well in the HTML report; the checked-in contract keeps the denominator fixed to the pinned app, and the live comparison catches drift. Adapted from an API testing course framework |
| D-19 | UI tests that move money through the page (`@ledger`) run in their own project, `ui-ledger`: one worker, with `dependencies` on `api` and `ui`, so they start once those have finished. Chosen by the user on 2026-11-26 | A separate CI step and npm script after the parallel run; a lock fixture that serializes money-moving tests across workers; `test.fail()` while the app bug stands; fewer workers for the whole suite | The app runs every money operation behind one global lock (an income ~2 s, a purchase ~4 s), and its pages give up on a request after 15 s while the server still completes it (`.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md`). A UI purchase queued behind parallel workers failed 3–7 times in 10. One project setting covers `npm test`, the CI full run and the pull-request run with one report. Costs: about 12 s of serial tail per run; a failure in `api` or `ui` reports the `@ledger` tests as not run; a pull request that selects one runs the whole `api` and `ui` projects |

## 13. Left to the builder and future work

Left to the plan or the builder:

- The alias mechanism (NFR-05): decided, see D-14.
- Which branch carries `.qa/` run folders (section 10): decided, see D-15.
- Workers and timeouts per environment profile.

Possible extensions, not in the first delivery:

- More features (farm resources, finance), following NFR-17.
- Firefox and WebKit projects; sharding with merged blob reports, once the full suite outgrows
  NFR-16.
- Types and schemas generated from Rolnopol's OpenAPI.
- Contract tests of the mocks against the live API.
- Feature-flag-driven tests (commodities trading, 2FA), GraphQL and WebSocket clients.
- Dependency updates through Renovate or Dependabot.
- Report publishing to GitHub Pages.

## Appendix A. Version check (2026-11-25)

| Package | Latest | Chosen | Note |
| ------- | ------ | ------ | ---- |
| Node.js | 27.0.0-alpha, 26.13.1 LTS | 26 LTS | Active LTS; Playwright supports 22, 24, 26 |
| `@playwright/test` | 1.65.1 (2026-11-13) | 1.65.x | `next` is a 1.66 alpha |
| `typescript` | 7.0.2 | 6.0.x | `typescript-eslint` peer range: `>=4.8.4 <6.1.0` |
| `typescript-eslint` | 8.74.0 | 8.74.x | Supports ESLint 8, 9, 10 |
| `eslint` | 10.15.0 | 10.x | |
| `prettier` | 3.10.1 | 3.10.x | |
| `zod` | 4.6.7 | 4.x | |
| `@faker-js/faker` | 10.6.0 | 10.x | |
| `@tsconfig/node26` | 26.0.2 | 26.x | ES2025, `nodenext` |
| Rolnopol Docker image | `latest` = 1.126.0 | 1.126.0 | Repo `main` is at 1.127.0; the image lags one version |

Versions are re-checked when the tooling skeleton is built; the lockfile is the source of truth
from then on.
