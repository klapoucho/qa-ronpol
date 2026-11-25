# Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Build everything the `qa-pick` workflow needs to write the five Marketplace tests (Phase A in
section 10 of the requirements, steps 2–7), and no Marketplace tests.

**Architecture:** A Playwright + TypeScript framework in `src/` (config, API client base, factories, UI
session via cookies, custom matchers, mock layer with a network guard) and three Playwright projects
(`api`, `ui`, `ui-mocked`), each proven by one small wiring check against Rolnopol 1.126.0 in Docker.
Around it: Git hooks, CI, the `qa-pick` skills adapted to this repo, five issue texts, and the README.

**Tech Stack:** Node.js 26 LTS, `@playwright/test` 1.65.x, TypeScript 6.0.x, zod 4, `@faker-js/faker` 10,
ESLint 10 + `typescript-eslint` 8.74 + `eslint-plugin-playwright`, Prettier 3.10, Husky, lint-staged,
commitlint, Docker Compose, GitHub Actions.

**Spec:** [`docs/requirements.md`](requirements.md). Read it with this plan: tasks cite its IDs
(`FR-xx`, `NFR-xx`, `D-xx`) instead of repeating them.

## Global Constraints

Every task's requirements include these lines.

- **Versions (NFR-01–03, appendix A):** Node 26 LTS (`.nvmrc` `26`, `engines.node` `>=26 <27`);
  `@playwright/test` 1.65.x; `typescript` 6.0.x, **not** 7.x (D-02); `typescript-eslint` 8.74.x; `eslint`
  10.x; `prettier` 3.10.x; `zod` 4.x; `@faker-js/faker` 10.x; `@tsconfig/node26` 26.x. No alpha, beta or
  `next` builds. Other dev tools (`@types/node`, `eslint-plugin-playwright`, `eslint-config-prettier`,
  `husky`, `lint-staged`, `@commitlint/*`): latest stable, checked with `npm view <pkg> version` at install.
- **Dependencies (NFR-06):** npm, committed `package-lock.json`, `npm ci` everywhere, exact versions
  (`save-exact=true`). No `dotenv`: `.env` is read with Node's `process.loadEnvFile()`.
- **Modules (NFR-04):** `"type": "module"`, `tsconfig` extends `@tsconfig/node26` (ES2025, `nodenext`) plus
  `strict`, `noUncheckedIndexedAccess`, `noEmit`.
- **Layers (FR-01, FR-05):** tests import `test` and `expect` only from the fixtures entry point
  (`src/fixtures/index.ts`), never from `@playwright/test`. No raw HTTP calls, raw selectors or data literals
  in tests.
- **Locators (FR-14):** `getByTestId`, then `getByRole` with a name, `getByLabel`, `getByText`. CSS only as a
  documented last resort, never nth-index.
- **No fixed waits (NFR-13):** never `waitForTimeout`.
- **Scope (D-12):** no Marketplace tests, and no Marketplace-specific clients, pages, components, factories,
  matchers or mock handlers. The test writer in Phase B adds them. Framework checks live under
  `tests/<project>/framework/`.
- **App under test (section 9, D-13):** `jaktestowac/rolnopol:1.126.0` on `BASE_URL` (default
  `http://localhost:3000`). Agents may run `npm run app:up`. Only the author runs `app:down`, `app:reset` or
  `RESET_DB=true`.
- **Commits (NFR-10, `CONTRIBUTING.md`):** Conventional Commits, one logical change each, each commit passes
  `npm run check` from the commit that introduces it. Agent commits end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **GitHub (`CLAUDE.md`):** ask the author before every `git push`, PR, or other GitHub write. Before any
  `gh` command, `gh api user --jq .login` must print `klapoucho`. Never merge a PR, never commit to `main`.
- **Secrets (NFR-20):** none in the repo, reports, `.qa/` or test step titles. `.env` is ignored.
- **Language:** English in code, docs, commits, branches and PRs.

## Review Focus

Inputs and conditions the spec implies but no ordinary test meets. Each one has its check in the owning task.

1. **Invalid configuration** (`TEST_ENV=staging`, `BASE_URL=localhost:3000` without a scheme,
   `RESET_DB=yes`): the run stops before any test and the message names the variable (FR-06). Check: Task 4,
   step 6.
2. **Users created in parallel:** emails stay unique across workers and runs without a DB reset, and every
   generated `displayedName` passes the app's rule (3–20 characters, letters, digits, spaces, `-`, `_`),
   otherwise seeding fails at random. Check: Task 5, `factories.spec.ts`.
3. **Cookie leak in the shared request context:** `POST /api/v1/register` sets a `rolnopolToken` cookie.
   If the fixture registers users through the test's `request` context, every later "anonymous" call is
   silently logged in as the last user, and T2-style negative tests pass for the wrong reason. Check:
   Task 5, `auth.spec.ts`, second test.
4. **Requests the mocks do not cover:** pages call `/api/version` (outside `/api/v1`), feature flags and
   `authorization` on every load. Any unmatched `/api/` request is answered with 501, recorded, and fails
   the test with its method and path, including requests fired after the test body. Check: Task 7,
   `network-guard` test and the poison step.
5. **App not in the expected state:** app down, a different version (the author's 1.127.0 clone), or
   port 3000 already taken when `npm run app:up` runs. Expected: a stop with the start command, a warning
   and a normal run, and a compose error that names the port. Check: Task 3, step 5 and Task 4, step 7.

## Branches and pull requests

Each group below is one branch and one PR, cut from the latest `main`. When the previous PR is not merged
yet, cut from its branch and rebase onto `main` after it merges. Every push and PR waits for the author's
yes.

| Branch | Tasks | PR title |
| ------ | ----- | -------- |
| `build/tooling-skeleton` | 1, 2 | `build: add tooling skeleton` |
| `feat/framework-core` | 3–7 | `feat: add framework core with wiring checks` |
| `ci/github-actions-workflow` | 8 | `ci: run checks and tests on pull requests` |
| `chore/qa-pick-setup` | 9 | `chore(qa): install and adapt the qa-pick workflow` |
| `docs/test-case-issues` | 10 | `docs(test-cases): add issue texts for T1–T5` |
| `docs/readme` | 11 | `docs: write the readme` |

Tasks 9 and 10 do not depend on the framework code and can run in parallel with Tasks 3–8.

## File map

```text
.nvmrc, .npmrc, package.json, package-lock.json      Task 1
tsconfig.json, eslint.config.js, .prettierrc.json,
.prettierignore, .gitignore, playwright.config.ts     Task 1 (config grows in Tasks 4, 7)
.husky/pre-commit, .husky/commit-msg,
commitlint.config.js, lint-staged in package.json     Task 2
compose.yaml, scripts/app-reset.ts                    Task 3
.env.example                                          Task 4
src/config/env.ts        env schema, parseEnv()       Task 4
src/config/profiles.ts   per-TEST_ENV defaults        Task 4
src/config/index.ts      loads .env, exports config   Task 4
src/api/http/api-response.ts  ApiResponse<T>          Task 4
src/api/http/base-api.ts      BaseApi                 Task 4
src/api/models/envelope.ts, health.ts                 Task 4
src/api/clients/health-api.ts, debug-api.ts           Task 4
src/fixtures/api.fixtures.ts, index.ts                Task 4 (grows in 5, 6, 7)
tests/global-setup.ts                                 Task 4
tests/api/framework/healthcheck.spec.ts               Task 4
src/data/unique.ts, src/data/factories/user.factory.ts         Task 5
src/api/models/user.ts, src/api/clients/auth-api.ts, users-api.ts  Task 5
tests/api/framework/factories.spec.ts, auth.spec.ts            Task 5
src/assertions/field-diff.ts, ui-matchers.ts, index.ts         Task 6
src/ui/session.ts, src/ui/pages/profile-page.ts                Task 6
src/fixtures/ui.fixtures.ts                                    Task 6
tests/ui/framework/session.spec.ts                             Task 6
src/mocks/mock-api.ts, envelope.ts                             Task 7
src/api/models/app-shell.ts                                    Task 7
src/mocks/handlers/app-shell.ts, profile.ts                    Task 7
src/mocks/payloads/profile.ts                                  Task 7
src/fixtures/mock.fixtures.ts                                  Task 7
tests/ui-mocked/framework/mocked-session.spec.ts               Task 7
.github/workflows/tests.yml                                    Task 8
.claude/skills/**, .qa/**, CLAUDE.md                           Task 9
docs/test-cases/*.md                                           Task 10
README.md                                                      Task 11
```

---

### Task 0: Prerequisites on the author's machine (author, no commit)

Agents cannot do these steps. The executing agent checks them and stops with this list if one fails.

- [ ] **Step 1: Install Docker.** Docker Desktop or Colima, with Compose v2. Check: `docker compose version`
      prints v2.x.
- [ ] **Step 2: Install Node 26 with nvm.** `nvm install 26 && nvm use 26`. Check: `node -v` prints `v26.`.
      (The machine has Node 22.22.3 as default now.)
- [ ] **Step 3: Free port 3000.** Stop the local Rolnopol 1.127.0 clone (`~/PycharmProjects/piotr/rolnopol`).
      Its `data/*.json` has local changes; that is the author's to keep or discard. Check:
      `curl -s localhost:3000/api/v1/about` fails to connect.
- [ ] **Step 4: Check the GitHub CLI.** `gh --version` is 2.99 or later (2.100.0 now) and
      `gh api user --jq .login` prints `klapoucho` (else `gh auth switch -u klapoucho`).

---

### Task 1: Package, TypeScript, ESLint and Prettier

Branch `build/tooling-skeleton`. Covers NFR-01–08, D-02, D-03, and the NFR-05 alias spike.

**Files:**
- Create: `.nvmrc`, `.npmrc`, `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`,
  `.prettierrc.json`, `.prettierignore`, `.gitignore`, `playwright.config.ts` (stub)
- Modify: `CLAUDE.md` (Current phase), `docs/requirements.md` (D-14, section 13)

**Interfaces:**
- Produces: npm scripts `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `lint:fix`, `format`
  (`prettier --write .`), `format:check` (`prettier --check .`), `check`
  (`npm run typecheck && npm run lint && npm run format:check`); the import alias chosen in step 3, used by
  every later task.

- [ ] **Step 1: Re-check versions.** Run `npm view <pkg> version` for every package in Global Constraints.
      If a pinned family has a newer patch, take it. If `typescript-eslint` now supports TypeScript 7, stop
      and ask the author (D-02 would change).
- [ ] **Step 2: Create the package.** `.nvmrc`: `26`. `.npmrc`: `save-exact=true` and `engine-strict=true`.
      `package.json`: `"name": "qa-ronpol"`, `"private": true`, `"type": "module"`,
      `"engines": { "node": ">=26 <27" }`. Install the dev dependencies with `npm install -D` (exact
      versions). `tsconfig.json` extends `@tsconfig/node26/tsconfig.json`, adds `strict`,
      `noUncheckedIndexedAccess`, `noEmit`, `types: ["node"]`, includes `src`, `tests`, `scripts`, `*.ts`.
- [ ] **Step 3: Alias spike (NFR-05).** Try candidate A first: `package.json`
      `"imports": { "#src/*": "./src/*" }`, imports written with the `.ts` extension
      (`import { x } from '#src/spike.ts'`), `allowImportingTsExtensions: true` in `tsconfig.json`. Create a
      throwaway `src/spike.ts` (`export const spike = 1;`) and `tests/spike.spec.ts` that imports it and
      asserts `expect(spike).toBe(1)`. Also import it in the stub `playwright.config.ts` (step 8), because
      Task 4 imports `src/config/` from there.
      Run: `npx tsc --noEmit && npx playwright test tests/spike.spec.ts && node -e "import('#src/spike.ts').then(m => console.log(m.spike))"`
      Expected: no type errors, `1 passed`, and `1` printed. If A fails in Playwright or tsc, use candidate B
      (`tsconfig` `paths` `"@src/*": ["./src/*"]`) and repeat without the `node -e` check. Delete both spike
      files. Later tasks write imports as `#src/...ts`; replace that prefix if B won.
- [ ] **Step 4: Record the decision.** Add to `docs/requirements.md` section 12:
      `| D-14 | Import alias: <chosen form> | <the other candidate> | <one line from the spike result> |`,
      and mark the NFR-05 line in section 13 as decided (D-14).
- [ ] **Step 5: ESLint (NFR-07).** `eslint.config.js` with `defineConfig` from `eslint/config`:
      `@eslint/js` recommended; `typescript-eslint` `recommendedTypeChecked` with
      `parserOptions.projectService` (allow the root `*.js` config files as default-project files);
      `@typescript-eslint/no-floating-promises: error`; `eslint-plugin-playwright`
      `flat/recommended` for `tests/**` and `src/**` with `playwright/no-wait-for-timeout: error`;
      `eslint-config-prettier` last. Ignore `node_modules`, `playwright-report`, `test-results`, `reports`,
      `.claude`, `.qa`.
- [ ] **Step 6: Prettier (NFR-08).** `.prettierrc.json`: `{ "printWidth": 110, "singleQuote": true }`.
      `.prettierignore`: `*.md` (docs keep their hand-made layout; our call), `package-lock.json`, the
      generated folders above, `.claude/`, `.qa/`.
- [ ] **Step 7: `.gitignore`.** `node_modules/`, `.env`, `playwright-report/`, `test-results/`,
      `blob-report/`, `reports/`, `.DS_Store`.
- [ ] **Step 8: Stub `playwright.config.ts`** with `export default defineConfig({ testDir: 'tests' })` so
      `tsc` has input. Task 4 replaces it.
- [ ] **Step 9: Update `CLAUDE.md`.** Replace the Current phase paragraph with: "Current phase: Phase A,
      building the framework by `docs/implementation-plan.md`. Marketplace tests are not written by hand:
      the author writes them in Phase B with `/qa-pick <issue>`."
- [ ] **Step 10: Run the checks.** Run: `npm run check`. Expected: exit 0. Then write
      `const p: Promise<void> = Promise.resolve(); p;` into a scratch `src/lint-probe.ts`, run `npm run lint`,
      expect `no-floating-promises`, and delete the file.
- [ ] **Step 11: Commit.**
      `git add .nvmrc .npmrc package.json package-lock.json tsconfig.json eslint.config.js .prettierrc.json .prettierignore .gitignore playwright.config.ts CLAUDE.md docs/requirements.md`
      Message: `build: add package, typescript, eslint and prettier setup` (body: the D-14 result).

### Task 2: Git hooks and commitlint

Branch `build/tooling-skeleton`. Covers NFR-09.

**Files:**
- Create: `.husky/pre-commit`, `.husky/commit-msg`, `commitlint.config.js`
- Modify: `package.json` (`prepare`, `lint-staged`)

- [ ] **Step 1: Install and wire.** `npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional`,
      `npx husky init`. `"prepare": "husky"`. `.husky/pre-commit`: `npx lint-staged`. `.husky/commit-msg`:
      `npx --no -- commitlint --edit "$1"`. `lint-staged`: `"*.{ts,js}": ["eslint --fix", "prettier --write"]`,
      `"*.{json,yml,yaml}": "prettier --write"`.
- [ ] **Step 2: `commitlint.config.js`.** Extends `@commitlint/config-conventional`; `type-enum` limited to
      `feat`, `test`, `fix`, `refactor`, `docs`, `build`, `ci`, `chore` (the `CONTRIBUTING.md` table);
      `subject-case` lower-case; `body-max-line-length` as a warning at 72.
- [ ] **Step 3: Verify the rules.**
      Run: `echo "Added login page." | npx commitlint` → Expected: fails (type, case, full stop).
      Run: `echo "style: tidy" | npx commitlint` → Expected: fails (`style` is not an allowed type).
      Run: `printf "docs: add x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n" | npx commitlint`
      → Expected: passes.
- [ ] **Step 4: Commit** `package.json package-lock.json .husky commitlint.config.js` with
      `build: add git hooks with lint-staged and commitlint`. The hook itself must accept this message.
- [ ] **Step 5: Open the PR** for `build/tooling-skeleton` after the author's yes (rebase on `main`,
      `npm run check`, push, `gh pr create`).

---

### Task 3: Rolnopol in Docker

Branch `feat/framework-core`. Covers section 9, D-01, D-13. Needs Task 0.

**Files:**
- Create: `compose.yaml`, `scripts/app-reset.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm run app:up` (`docker compose up --detach --wait`), `app:down` (`docker compose down`),
  `app:logs` (`docker compose logs --follow`), `app:reset`
  (`node --env-file-if-exists=.env scripts/app-reset.ts`).

- [ ] **Step 1: Check the image platform.** Run: `docker manifest inspect jaktestowac/rolnopol:1.126.0`.
      If there is no `arm64` entry, add `platform: linux/amd64` to the service in step 2 and note it in the
      README limits (Task 11).
- [ ] **Step 2: `compose.yaml`.** One service `rolnopol`, image `jaktestowac/rolnopol:1.126.0`, ports
      `3000:3000`, healthcheck test
      `["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/v1/healthcheck').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]`,
      `interval: 2s`, `timeout: 5s`, `retries: 30`, `start_period: 5s`.
- [ ] **Step 3: `scripts/app-reset.ts`.** No imports from `src/`. Reads `BASE_URL` (default
      `http://localhost:3000`), sends `POST /api/debug/database/restore-base`, prints the response message,
      exits 1 on a non-2xx status.
- [ ] **Step 4: Verify the app.**
      Run: `npm run app:up && curl -s localhost:3000/api/v1/about` → Expected: compose reports the container
      healthy, and the JSON has `"version":"1.126.0"`.
      Run: `npm run app:up` again → Expected: exit 0, nothing restarted.
- [ ] **Step 5: Port conflict (Review Focus 5).** With the app up, run
      `docker run --rm -p 3000:3000 jaktestowac/rolnopol:1.126.0`. Expected: an error naming port 3000. Note
      the wording for the README troubleshooting line.
- [ ] **Step 6: Commit** `compose.yaml scripts/app-reset.ts package.json` with
      `build(app): run rolnopol 1.126.0 in docker compose`. (`npm run check` still passes: `typecheck` covers
      `scripts/`.)

### Task 4: Configuration, API client base, global setup, `api` wiring check

Branch `feat/framework-core`. Covers FR-02, FR-03 (envelope), FR-05, FR-06, FR-07, FR-08, FR-12 (`RESET_DB`),
FR-16, FR-17, FR-18, FR-19, NFR-14, NFR-15.

**Files:**
- Create: `.env.example`, `src/config/{env,profiles,index}.ts`, `src/api/http/{api-response,base-api}.ts`,
  `src/api/models/{envelope,health}.ts`, `src/api/clients/{health-api,debug-api}.ts`,
  `src/fixtures/{api.fixtures,index}.ts`, `tests/global-setup.ts`, `tests/api/framework/healthcheck.spec.ts`
- Modify: `playwright.config.ts`, `package.json` (scripts)

**Interfaces:**
- Produces:
  - `parseEnv(source: NodeJS.ProcessEnv): Env` with
    `Env = { BASE_URL: string; TEST_ENV: 'local' | 'ci'; EXPECTED_APP_VERSION: string; RESET_DB: boolean }`.
    Throws `Error` whose message starts `Invalid configuration:` and has one line per bad variable,
    `  <NAME>: <zod message>`.
  - `config: Env & { profile: Profile }` from `src/config/index.ts`, which first calls
    `process.loadEnvFile('.env')` when the file exists.
  - `Profile = { retries: number; workers: number | undefined; forbidOnly: boolean; timeout: number; expectTimeout: number; reporter: ReporterDescription[] }`.
  - `class ApiResponse<T> { readonly status: number; readonly ok: boolean; readonly error: string | undefined; readonly body: unknown; get data(): T }`.
    `data` throws `ApiRequestError` with `"<METHOD> <path> -> <status>: <error>"` when `ok` is false.
  - `abstract class BaseApi { constructor(request: APIRequestContext, token?: string) }` with protected
    `get<T>(path, schema)`, `post<T>(path, body, schema)`, `put<T>(path, body, schema)`, `delete<T>(path, schema)`,
    each `Promise<ApiResponse<T>>`. A path without a leading `/` is relative to `/api/v1/`; one with `/` is
    used as is. A token is sent as `Authorization: Bearer <token>`.
  - `type ApiClientClass<T extends BaseApi> = new (request: APIRequestContext, token?: string) => T`.
  - `HealthApi.healthcheck(): Promise<ApiResponse<Healthcheck>>`, `HealthApi.about(): Promise<ApiResponse<About>>`.
  - `DebugApi.restoreBaseDatabase(): Promise<ApiResponse<unknown>>` (`POST /api/debug/database/restore-base`).
  - Fixture `apiAs: <T extends BaseApi>(Client: ApiClientClass<T>, user?: { token: string }) => T`, built on
    the test's `request` fixture.
  - `test`, `expect` exported from `src/fixtures/index.ts`.

- [ ] **Step 1: Write the wiring check** `tests/api/framework/healthcheck.spec.ts`:

```ts
import { test, expect } from '#src/fixtures/index.ts';
import { HealthApi } from '#src/api/clients/health-api.ts';

test('app reports a healthy status', { tag: '@smoke' }, async ({ apiAs }) => {
  const health = await apiAs(HealthApi).healthcheck();

  expect(health.status).toBe(200);
  expect(health.data.status).toBe('healthy');
});
```

- [ ] **Step 2: Run it to see it fail.** Run: `npx playwright test tests/api/framework` → Expected: fails to
      resolve `#src/fixtures/index.ts`.
- [ ] **Step 3: Config.** `env.ts`: zod schema with `BASE_URL` `z.url()` default `http://localhost:3000`,
      `TEST_ENV` `z.enum(['local','ci'])` default `local`, `EXPECTED_APP_VERSION` semver string default
      `1.126.0`, `RESET_DB` `z.enum(['true','false'])` default `false` transformed to boolean. `profiles.ts`
      (our call, section 13): `local` = retries 0, workers `undefined` (Playwright default), forbidOnly
      false, timeout 30 000, expect 5 000, reporters `list` + `html` (`open: 'never'`); `ci` = retries 1,
      workers 4, forbidOnly true, same timeouts, reporters `github` + `html` (`open: 'never'`) + `junit`
      (`outputFile: 'reports/junit.xml'`). `.env.example` lists the four variables with their defaults and
      one comment line each.
- [ ] **Step 4: API base and clients.** `envelope.ts`: `successEnvelope(dataSchema)` for
      `{ success: true, timestamp, data, message? }` and `errorEnvelope` for
      `{ success: false, timestamp, error: string, details? }`. `BaseApi` parses JSON, picks the envelope by
      `success`, and validates `data` with the given schema; a schema mismatch throws with the request line
      and the zod issues (FR-03). A non-JSON body gives `ok: false` and `error: 'Non-JSON response'`.
      `health.ts`: `healthcheckSchema` (`status`, `version`) and `aboutSchema` (`name`, `version`); zod
      objects keep their default key stripping, so new app fields do not break them.
- [ ] **Step 5: Playwright config, global setup, scripts.** `playwright.config.ts` reads `config`:
      `fullyParallel: true`, `globalSetup: './tests/global-setup.ts'`, `use.baseURL`,
      `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, profile
      values. Projects: `api` (`testDir: 'tests/api'`, no `devices` entry). `global-setup.ts`: a
      `request.newContext({ baseURL })`, `HealthApi.healthcheck()`; on a network error or non-200, throw
      `Rolnopol is not reachable at <BASE_URL>. Start it with: npm run app:up`. Then `about()`: a version
      other than `EXPECTED_APP_VERSION` logs
      `Warning: Rolnopol <actual> differs from EXPECTED_APP_VERSION <expected>; continuing.` When
      `RESET_DB` is true, call `DebugApi.restoreBaseDatabase()` and log it. Scripts: `test`
      (`playwright test`), `test:api` (`--project=api`), `test:smoke` (`--grep @smoke`), `report`
      (`playwright show-report`); `check` gains `&& playwright test --list`.
- [ ] **Step 6: Run and verify (Review Focus 1).**
      Run: `npm run test:api` → Expected: `1 passed`.
      Run: `TEST_ENV=staging npx playwright test --list`, `BASE_URL=localhost:3000 npx playwright test --list`,
      `RESET_DB=yes npx playwright test --list` → Expected: each exits non-zero, prints
      `Invalid configuration:` and names its variable.
- [ ] **Step 7: Verify global setup (Review Focus 5).**
      Run: `BASE_URL=http://localhost:3999 npm run test:api` → Expected: stops before any test with the
      `npm run app:up` message.
      Run: `EXPECTED_APP_VERSION=9.9.9 npm run test:api` → Expected: the warning line, then `1 passed`.
- [ ] **Step 8: Poison check (NFR-12).** Change `'healthy'` to `'unhealthy'` in the spec, run, expect a
      failure, revert.
- [ ] **Step 9: Commit.** `npm run check`, then commit all files above with
      `feat(config): add env config, api client base and healthcheck wiring check`.

### Task 5: Factories, auth clients, user seeding

Branch `feat/framework-core`. Covers FR-02, FR-03, FR-10, FR-11, FR-12.

**Files:**
- Create: `src/data/unique.ts`, `src/data/factories/user.factory.ts`, `src/api/models/user.ts`,
  `src/api/clients/{auth-api,users-api}.ts`, `tests/api/framework/{factories,auth}.spec.ts`
- Modify: `src/fixtures/api.fixtures.ts`

**Interfaces:**
- Consumes: `BaseApi`, `ApiResponse<T>`, `apiAs` (Task 4).
- Produces:
  - `uniqueId(): string`: 10 lowercase hex characters from `crypto.randomUUID()`.
  - `type UserInput = { email: string; displayedName: string; password: string }` (from `registerRequestSchema`).
  - `buildUser(overrides?: Partial<UserInput>): UserInput`: email `qa.<uniqueId>@example.test`;
    `displayedName` = faker first name with non-letters removed, cut to 9 characters, `_`, `uniqueId()`
    (at most 20); password of 12+ characters with upper, lower, digit and special character, so it also
    passes when `registrationStrongPasswordEnabled` is on.
  - `AuthApi.register(input: UserInput): Promise<ApiResponse<RegisterResult>>` with
    `RegisterResult = { user: User; token: string }`; `AuthApi.login(email: string, password: string)`.
  - `type UserProfile` inferred from `profileSchema` in `user.ts` (at least `id`, `email`, `displayedName`).
  - `UsersApi.profile(): Promise<ApiResponse<UserProfile>>` (`GET users/profile`).
  - `type TestUser = { input: UserInput; id: User['id']; token: string }`.
  - Fixture `createUser: (overrides?: Partial<UserInput>) => Promise<TestUser>`. It registers through a
    fresh `playwright.request.newContext({ baseURL })` and disposes it, so the test's `request` context never
    stores a `rolnopolToken` cookie (Review Focus 3). A failed registration throws
    `Seeding failed: register <email> -> <status>: <error>` (FR-11).

- [ ] **Step 1: Pin the shapes.** With `curl`, register one user on the Docker app, then call
      `GET /api/v1/users/profile` with `Authorization: Bearer <token>`, then without any token. Write the
      schemas in `user.ts` from the real bodies (keep only fields we use: `id`, `email`, `displayedName`).
      Note the anonymous status code for step 2.
- [ ] **Step 2: Write the checks** `tests/api/framework/factories.spec.ts` and `auth.spec.ts`:

```ts
// factories.spec.ts
test('user factory builds unique users that match the app rules', () => {
  const users = Array.from({ length: 1000 }, () => buildUser());

  expect(new Set(users.map((u) => u.email)).size).toBe(users.length);
  expect(users.filter((u) => !/^[A-Za-z0-9 _-]{3,20}$/.test(u.displayedName))).toEqual([]);
  expect(users.filter((u) => !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(u.password))).toEqual([]);
});

test('user factory keeps the fields a test overrides', () => {
  expect(buildUser({ displayedName: 'Fixed_Name' }).displayedName).toBe('Fixed_Name');
});

// auth.spec.ts
test('registered user reads their own profile with their token', async ({ createUser, apiAs }) => {
  const user = await createUser();

  const profile = await apiAs(UsersApi, user).profile();

  expect(profile.data).toMatchObject({ email: user.input.email, displayedName: user.input.displayedName });
});

test('a call without a token stays anonymous after users were created', async ({ createUser, apiAs }) => {
  await createUser();

  const profile = await apiAs(UsersApi).profile();

  expect(profile.status).toBe(401); // the status pinned in step 1
  expect(profile.error).toBeTruthy();
});
```

- [ ] **Step 3: Run them to see them fail.** Run: `npm run test:api` → Expected: the new specs fail on
      missing modules.
- [ ] **Step 4: Implement** the Produces list above.
- [ ] **Step 5: Run and stress.** Run: `npm run test:api` → Expected: all pass. Run:
      `npx playwright test tests/api/framework --repeat-each=10 --workers=4` → Expected: all pass (NFR-14).
- [ ] **Step 6: Poison checks.** (a) Register through the test's `request` fixture instead of a fresh
      context: the anonymous test must fail; revert. (b) Change the factory's name cut from 9 to 15
      characters: the factory test must fail; revert.
- [ ] **Step 7: Commit** with `feat(data): add user factory, auth clients and user seeding fixture`.

### Task 6: Custom matchers, cookie login, `ui` wiring check

Branch `feat/framework-core`. Covers FR-04, FR-13, FR-14, FR-16, FR-20.

**Files:**
- Create: `src/assertions/{field-diff,ui-matchers,index}.ts`, `src/ui/session.ts`,
  `src/ui/pages/profile-page.ts`, `src/fixtures/ui.fixtures.ts`, `tests/ui/framework/session.spec.ts`
- Modify: `src/fixtures/index.ts` (merge fixtures, export the extended `expect`), `playwright.config.ts`
  (project `ui`), `package.json` (`test:ui`)

**Interfaces:**
- Consumes: `createUser`, `TestUser` (Task 5).
- Produces:
  - `type FieldMismatch = { field: string; expected: string | RegExp; actual: string | undefined }`;
    `diffFields(expected: Record<string, string | RegExp>, actual: Record<string, string | undefined>): FieldMismatch[]`
    (strings compared after trimming); `formatMismatches(mismatches: FieldMismatch[]): string`, one line per
    field: `  <field>: expected <expected>, received <actual>`.
  - `interface FieldView<K extends string = string> { readonly fields: Readonly<Record<K, Locator>> }`.
  - Matcher `toShowFields(expected: Partial<Record<K, string | RegExp>>, options?: { timeout?: number })` on
    a `FieldView`. It re-reads every field's `innerText` until all match or the timeout (default: the
    configured expect timeout) runs out, then fails listing **every** mismatching field. Registered with
    `expect.extend` in `src/assertions/index.ts`, with the TypeScript `Matchers` declaration.
  - `sessionCookies(token: string, baseURL: string): Cookie[]`: `rolnopolToken` =
    `encodeURIComponent(token)` (the frontend decodes it) and `rolnopolIsLogged` = `true`, path `/`, domain
    from `baseURL`.
  - Fixture `loginAs: (user: { token: string }) => Promise<void>`: adds `sessionCookies` to `context`.
  - `class ProfilePage { constructor(page: Page); goto(): Promise<void>; readonly details: FieldView<'email' | 'displayedName'> }`
    on `/profile.html`, fields `getByTestId('email-value')` and `getByTestId('displayed-name')`.
  - Fixture `profilePage: ProfilePage`.

- [ ] **Step 1: Write the wiring check** `tests/ui/framework/session.spec.ts`:

```ts
test('user logged in through cookies sees their own profile', async ({ createUser, loginAs, profilePage }) => {
  const user = await createUser();
  await loginAs(user);

  await profilePage.goto();

  await expect(profilePage.details).toShowFields({
    email: user.input.email,
    displayedName: user.input.displayedName,
  });
});
```

- [ ] **Step 2: Run it to see it fail.** Run: `npx playwright test --project=ui` → Expected: fails (no `ui`
      project or missing fixtures).
- [ ] **Step 3: Implement** the Produces list. Project `ui`: `testDir: 'tests/ui'`,
      `use: { ...devices['Desktop Chrome'] }`. Script `test:ui` (`--project=ui`).
- [ ] **Step 4: Run.** Run: `npx playwright install chromium && npm run test:ui` → Expected: `1 passed`.
- [ ] **Step 5: Poison checks.** (a) Set the cookie without `encodeURIComponent`: if the test still passes,
      keep the encoding anyway (it matches the frontend) and note it in the commit body. (b) Expect
      `displayedName: 'Somebody Else'`: the test must fail with a message naming `displayedName`; revert.
- [ ] **Step 6: Commit** with `feat(ui): add cookie login, profile page and field matcher`.

### Task 7: Mock layer, network guard, `ui-mocked` wiring checks

Branch `feat/framework-core`. Covers FR-03 (shared types), FR-15, FR-16, D-08, D-11.

**Files:**
- Create: `src/mocks/{mock-api,envelope}.ts`, `src/api/models/app-shell.ts`,
  `src/mocks/handlers/{app-shell,profile}.ts`, `src/mocks/payloads/profile.ts`,
  `src/fixtures/mock.fixtures.ts`, `tests/ui-mocked/framework/mocked-session.spec.ts`
- Modify: `src/fixtures/index.ts`, `playwright.config.ts` (project `ui-mocked`), `package.json`
  (`test:ui-mocked`)

**Interfaces:**
- Consumes: `ProfilePage`, `toShowFields`, `sessionCookies` (Task 6); `UserProfile` type (Task 5).
- Produces:
  - `type MockReply = { status?: number; body: unknown }` (status default 200).
  - `class MockApi { on(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string | RegExp, reply: MockReply | ((request: Request) => MockReply | Promise<MockReply>)): this; readonly unhandled: readonly string[]; clearUnhandled(): void }`.
    One `context.route('**/api/**')` dispatcher matches on method and URL pathname (`/api/v1/users/profile`,
    query ignored); a later `on` for the same method and path replaces the earlier one. An unmatched request
    is answered `501` with an error envelope and recorded as `"<METHOD> <pathname>"`.
  - `ok<T>(data: T, message?: string)` and `fail(error: string, status: number)` in `src/mocks/envelope.ts`,
    returning `MockReply` with the app's envelope.
  - `mockAppShell(api: MockApi): void`: the calls every page makes on load (from step 1: at least
    `GET /api/v1/feature-flags`, `GET /api/v1/authorization`, `GET /api/version`), with payloads typed by
    `src/api/models/app-shell.ts` and feature flags at the image's defaults.
  - `buildProfile(overrides?: Partial<UserProfile>): UserProfile`; `mockProfile(api: MockApi, profile: UserProfile): void`
    (the profile page's own calls).
  - Option fixture `networkGuard: boolean` (default `false`; `true` in the `ui-mocked` project). When true,
    the `context` fixture override attaches a `MockApi` before the test and, after it, fails with
    `Network guard: <n> API request(s) reached no mock handler:` plus one line per request.
  - Fixture `mockApi: MockApi`: the context's instance; throws "mockApi needs networkGuard: true (the
    ui-mocked project)" otherwise.
  - Fixture `fakeLogin: () => Promise<void>`: `sessionCookies('mock-token', baseURL)`.

- [ ] **Step 1: Record what the page calls.** Load `/profile.html` once with real cookies (a user from
      `curl` register) and list the `/api/` requests (`playwright-cli requests` or the trace). With fake
      cookies the page gets 403 from `GET /api/v1/authorization` and redirects to `/login.html`, so the
      authorized list is the one to mock. Capture the real bodies of each call for the schemas.
- [ ] **Step 2: Write the checks** `tests/ui-mocked/framework/mocked-session.spec.ts`:

```ts
test.beforeEach(async ({ mockApi, fakeLogin }) => {
  mockAppShell(mockApi);
  await fakeLogin();
});

test('profile shows the user the API returns', async ({ mockApi, profilePage }) => {
  const profile = buildProfile();
  mockProfile(mockApi, profile);

  await profilePage.goto();

  await expect(profilePage.details).toShowFields({ email: profile.email, displayedName: profile.displayedName });
});

test('network guard records API requests no handler serves', async ({ mockApi, page, profilePage }) => {
  mockProfile(mockApi, buildProfile());
  await profilePage.goto();

  await page.evaluate(() => fetch('/api/v1/not-mocked?page=2', { method: 'POST' }));

  expect(mockApi.unhandled).toContain('POST /api/v1/not-mocked');
  mockApi.clearUnhandled();
});

test('field matcher lists every mismatching field', async ({ mockApi, profilePage }) => {
  mockProfile(mockApi, buildProfile());
  await profilePage.goto();

  await expect(
    expect(profilePage.details).toShowFields({ email: 'wrong@example.test', displayedName: 'Wrong' }, { timeout: 1_000 }),
  ).rejects.toThrow(/email[\s\S]*wrong@example\.test[\s\S]*displayedName[\s\S]*Wrong/);
});
```

- [ ] **Step 3: Run them to see them fail.** Run: `npx playwright test --project=ui-mocked` → Expected: fails.
- [ ] **Step 4: Implement** the Produces list. Project `ui-mocked`: `testDir: 'tests/ui-mocked'`,
      `use: { ...devices['Desktop Chrome'], networkGuard: true }`. Script `test:ui-mocked`.
- [ ] **Step 5: Run.** Run: `npm run test:ui-mocked` → Expected: `3 passed`. If the first test fails on the
      guard, its message lists the missing handlers: add them to `mockAppShell` or `mockProfile`, never
      to the test.
- [ ] **Step 6: Poison checks (Review Focus 4).** (a) Remove `mockApi.clearUnhandled()`: the guard test must
      fail after its body with `POST /api/v1/not-mocked` in the message; revert. (b) Remove the
      `/api/version` handler: the first test must fail naming `GET /api/version`; revert. (c) Stop the
      guard's dispatcher from fulfilling (call `route.continue()`): the guard test must fail; revert.
- [ ] **Step 7: Full run.** Run: `npm run check && npm test && npx playwright test --repeat-each=5` →
      Expected: all pass, no flaky tests (NFR-14, NFR-15).
- [ ] **Step 8: Commit** with `feat(mocks): add mock api with network guard and mocked profile check`.
- [ ] **Step 9: Open the PR** for `feat/framework-core` after the author's yes.

---

### Task 8: CI workflow

Branch `ci/github-actions-workflow`. Covers FR-19, NFR-15, NFR-16, NFR-21, section 9 (CI).

**Files:**
- Create: `.github/workflows/tests.yml`

- [ ] **Step 1: Check action versions.** Use the latest major of `actions/checkout`, `actions/setup-node`
      and `actions/upload-artifact`, checked on their release pages at write time.
- [ ] **Step 2: Write the workflow.** Triggers: `pull_request` and `push` to `main`;
      `concurrency: { group: tests-${{ github.ref }}, cancel-in-progress: true }`;
      `permissions: { contents: read }`. One job on `ubuntu-latest`, `timeout-minutes: 15`, env
      `TEST_ENV: ci`. Steps: checkout; setup-node with `node-version-file: .nvmrc` and `cache: npm`;
      `npm ci`; `npm run check`; `npx playwright install --with-deps chromium`; `npm run app:up`; `npm test`;
      `if: always()`: `docker compose logs --no-color > reports/app.log`, upload `playwright-report/` and
      `reports/` as artifacts (14 days).
- [ ] **Step 3: Local dry run.** Run: `TEST_ENV=ci npm test` → Expected: all pass with the CI reporters,
      `reports/junit.xml` exists.
- [ ] **Step 4: Commit** with `ci: run checks and tests on pull requests`.
- [ ] **Step 5: Push and open the PR** after the author's yes. Expected: the workflow is green, the
      test step takes under 2 minutes (NFR-16), the artifacts are attached. A red run is fixed on this
      branch before the PR is ready.

---

### Task 9: `qa-pick` installation and adaptation

Branch `chore/qa-pick-setup`. Covers section 10 ("Required adaptations"), D-09, and the run-folder decision
(D-15).

**Files:**
- Create: `.claude/skills/**` (copied), `.qa/README.md`, `.qa/bugs/.gitkeep`, `.qa/notes/.gitkeep`,
  `.qa/lessons.md`
- Modify: `.claude/skills/qa-pick/SKILL.md`, `CLAUDE.md`, `.gitignore`, `docs/requirements.md` (D-15)

- [ ] **Step 1: Copy the skills.** Run: `cp -R ~/PycharmProjects/piotr/qa-pick-portable/.claude/skills/. .claude/skills/`.
      Expected: `playwright-cli`, `playwright-trace`, `qa-pick`, `qa-review`, `qa-test`, `testing-rules`.
      `playwright-cli` and `playwright-trace` stay unchanged (upstream copies).
- [ ] **Step 2: `.gitignore`.** Add `.claude/worktrees/`, `.playwright-cli/`, `.qa/runs/*/scratch/`.
- [ ] **Step 3: Decide where run folders go (D-15).** A run's folder (without `scratch/`) and the bug files it
      created or updated are committed **on its test branch**, in one `docs(qa): add qa-pick run <run-id>`
      commit, so the evidence reaches `main` in the same PR as the tests. A run without automation commits
      the same set on `docs/qa-run-<slug>`. Lessons go with the retro's skill-edit branch. Add the D-15 row
      to `docs/requirements.md` section 12 and mark the section 13 item decided.
- [ ] **Step 4: Edit `qa-pick/SKILL.md`** for D-15, three places:
  - In **Paths**, replace the reason after "Give every agent absolute paths" with: "the run folder is not
    committed until §6, so it does not exist in the writer's worktree, and the skills may not be on the main
    branch yet. In this repo `.qa/` is committed, except `runs/*/scratch/`, which holds live tokens and is
    ignored."
  - In **§6**, before "ask the user before pushing", add: "**Commit the run evidence** to the test branch:
    copy `{RUN_DIR}` without `scratch/`, and the bug files this run created or updated, into the worktree at
    the same paths. Update `report.md`, `results.json` and `summary.md` with the branch first. Grep the copy
    for `token`, `password` and `Bearer` and remove any live value. Commit as
    `docs(qa): add qa-pick run <run-id>`. With automation skipped, commit the same set on
    `docs/qa-run-<slug>` in a worktree cut from `origin/main`, and ask before pushing it."
  - Add **§8 Clean-up** at the end: "After the retro, remove from the main checkout the `.qa/` files that
    are now committed on a branch (`git checkout -- <path>` for tracked files, delete untracked ones;
    `scratch/` stays). Otherwise pulling `main` after the merge stops on untracked files. Commit
    `.qa/lessons.md` with the retro's skill-edit branch, or alone on `docs/qa-lessons-<run-id>`."
- [ ] **Step 5: Create `.qa/`.** `README.md` (what each folder holds, that scratch is ignored and why,
      D-09, D-15), `lessons.md` (title and "newest first"), `.gitkeep` in `bugs/` and `notes/`.
- [ ] **Step 6: Edit `CLAUDE.md`.** Add under Rules for Claude:
      "- Exception: `/qa-pick` may add the `klapoucho` account as assignee of the issue it tests
      (`gh issue edit --add-assignee @me`) without asking. Every other GitHub write still needs approval."
      Add a section:

```markdown
## QA settings

- App URL: http://localhost:3000 (Rolnopol 1.126.0 in Docker)
- API base URL: http://localhost:3000/api/v1
- Start the app: `npm run app:up` in this repo. Agents may start the app when it is not running. They never stop or reset it (`npm run app:down`, `npm run app:reset`, `RESET_DB=true`, `POST /api/debug/database/restore-base`); only the author does.
- Roles: user → `POST /api/v1/register` with `{ email, displayedName, password }` returns a token. New users have 0 ROL; add funds with `POST /api/v1/financial/transactions`. Never use the demo accounts.
- Test framework: Playwright Test (TypeScript). Framework code in `src/`, tests in `tests/{api,ui,ui-mocked}/<feature>/`, conventions in `README.md`. Runner process name: `playwright`
- Install dependencies: `npm ci`
- Gate: `npm run typecheck`, `npx eslint <files>`, `npx playwright test --list <files>`
- Main branch: main
- Issue repository: klapoucho/qa-ronpol
- GitHub account: klapoucho
- App repository: jaktestowac/rolnopol
```

- [ ] **Step 7: Playwright CLI.** Run: `npm view @playwright/cli version` (0.1.25 on 2026-11-25; 0.1.24 is
      installed). Upgrade with `npm install -g @playwright/cli@<version>` and record the version for the
      README prerequisites. This is a machine install, not a project dependency, because the skills call
      `playwright-cli` directly.
- [ ] **Step 8: Check the skill names.** Run: `ls ~/.claude/skills ~/.claude/skills/synced 2>/dev/null | grep -x -E 'qa-pick|qa-review|qa-test|testing-rules|playwright-cli|playwright-trace'`
      → Expected: no output (no user-level copy shadows a project skill). Then ask the author to open a new
      Claude Code session in the repo and confirm `/qa-pick` shows the project description ("Autonomous QA
      run for one story given after the command…").
- [ ] **Step 9: Verify and commit.** Run: `npm run check` → Expected: passes (`.claude/` and `.qa/` are
      outside lint and format). Run: `git status --short` → Expected: no `scratch/`, `worktrees/` or
      `.playwright-cli/` paths. Commit in two commits:
      `chore(qa): add qa-pick skills from qa-pick-portable` (the verbatim copy) and
      `chore(qa): adapt qa-pick to this repository` (the SKILL edits, `.qa/`, `CLAUDE.md`, `.gitignore`,
      D-15). Open the PR after the author's yes.

---

### Task 10: Test case issues T1–T5

Branch `docs/test-case-issues`. Covers section 5 and section 10 ("Test cases as GitHub issues").

**Files:**
- Create: `docs/test-cases/README.md` (index), `docs/test-cases/t1-sale-between-two-users.md`,
  `t2-business-rules.md`, `t3-seller-lists-an-item.md`, `t4-buyer-buys-an-offer.md`,
  `t5-browse-renders-api-data.md`

- [ ] **Step 1: Write the index.** A table: T, title, labels, file, issue (empty until step 4).

| T | Title | Labels |
| -- | ----- | ------ |
| T1 | `Marketplace: sale between two users (API)` | `marketplace`, `api`, `test-case` |
| T2 | `Marketplace: business rules for offers and purchases (API)` | `marketplace`, `api`, `test-case` |
| T3 | `Marketplace: seller lists an item (UI)` | `marketplace`, `ui`, `test-case` |
| T4 | `Marketplace: buyer buys an offer (UI)` | `marketplace`, `ui`, `test-case` |
| T5 | `Marketplace: browse renders API data (UI on mocks)` | `marketplace`, `ui-mocked`, `test-case` |

- [ ] **Step 2: Write the five bodies.** Each file is exactly the issue body, in this order: **User story**
      (below); **Context** (the first paragraph of requirements 4.2, copied); **Acceptance criteria** (the
      `AC` items from the T's Covers column, copied word for word, including AC-8's note); **Test** (level and
      folder `tests/<project>/marketplace/`, the Scenario and What it shows cells copied, "Done means
      section 11 of the requirements"); **Reference** (link to
      `https://github.com/klapoucho/qa-ronpol/blob/main/docs/requirements.md`, valid once that PR merges).
  - T1: "As a seller, I want a funded buyer to buy my listed field, so that I receive the price in ROL and
    the buyer owns the field."
  - T2: "As a Marketplace user, I want invalid offers and purchases refused with a clear message, so that
    nobody loses money or items by mistake."
  - T3: "As a farmer, I want to list a field I own in the Marketplace, so that other users can buy it."
  - T4: "As a buyer, I want to buy an offer from Browse and confirm it, so that the item becomes mine and I
    see the cost in my balance and history."
  - T5: "As a user browsing the Marketplace, I want offers, pages, an empty list and API errors shown
    clearly, so that I always know what is on offer."
- [ ] **Step 3: Commit** with `docs(test-cases): add issue texts for t1–t5`, open the PR after the author's yes.
- [ ] **Step 4: Create the labels and issues (GitHub write: ask first).** After the author approves the
      texts: check `gh api user --jq .login` prints `klapoucho`; create the missing labels with
      `gh label create <name> --repo klapoucho/qa-ronpol`; for each T,
      `gh issue create --repo klapoucho/qa-ronpol --title "<title>" --body-file docs/test-cases/<file> --label marketplace,<level>,test-case`.
      Fill the issue numbers in the index and commit `docs(test-cases): record issue numbers` on the same
      branch (before the merge) or a follow-up branch.

---

### Task 11: README

Branch `docs/readme`. Covers section 4 of the original task, G4, NFR-19, NFR-21, section 9 (fallback).
Run it last: it describes what Tasks 1–10 built.

**Files:**
- Modify: `README.md`, `CLAUDE.md` (Current phase → Phase B)

- [ ] **Step 1: Write the README** with these sections, short, linking to `docs/requirements.md` for detail:
  1. What this is (one paragraph, the Marketplace on three levels, status).
  2. Tech stack and decisions: a table of the key choices with their `D-xx`, and why.
  3. Project structure: the tree from requirements section 8, as built, with one line per folder.
  4. Prerequisites: Node 26 (`nvm use`), Docker with Compose v2; for `/qa-pick` only: `gh` ≥ 2.99 logged in
     as `klapoucho`, `@playwright/cli` at the version from Task 9.
  5. Running the tests: the NFR-21 sequence (`npm ci`, `npx playwright install --with-deps chromium`,
     `npm run app:up`, `npm test`), the scripts table (FR-18), the environment variables table (FR-06) with
     the profiles (FR-07), reports (FR-19).
  6. The app under test: Docker, who may reset it (section 9), troubleshooting for port 3000 (Task 3,
     step 5), the fallback with a local clone (`npm start`; tests target 1.126.0; a running clone writes to
     its tracked `data/*.json`).
  7. How to add a test or feature (NFR-19): naming rules (section 8) and a checklist: folders per project,
     client extends `BaseApi` and is used with `apiAs`, zod schema in `src/api/models/`, factory, page
     object and components, matcher only when FR-20 says so, mock handlers built from the schemas,
     `.params.ts` for cases, tags, `test.fail()` with a bug link, `npm run check`, poison test.
  8. AI-assisted workflow: Phase A and B, the issue list (Task 10 numbers), how to run `/qa-pick <issue>`,
     what lands in `.qa/` (D-09, D-15), attribution.
  9. Assumptions and limits: Chromium only, Marketplace only, intentional app bugs, traces and reports may
     hold session cookies of throwaway users (reports are not committed), the image platform note if
     Task 3 needed it.
- [ ] **Step 2: Third-party run (G4, NFR-21).** In the scratchpad, `git clone` the repo at this branch, then
      follow the README commands exactly. Expected: `npm run check` and `npm test` pass. Every command
      that needed something the README does not say is a README fix.
- [ ] **Step 3: Update `CLAUDE.md`.** Current phase: "Phase B: the author writes the Marketplace tests with
      `/qa-pick <issue>`."
- [ ] **Step 4: Commit** with `docs: write the readme`, open the PR after the author's yes.

---

## Phase A done (requirements section 11)

- [ ] `npm run check` and all wiring checks pass locally against the Docker app and in CI on `main`.
- [ ] `qa-pick` is installed and adapted, and `/qa-pick` loads the project copy.
- [ ] The five issues exist in `klapoucho/qa-ronpol` with their labels.
- [ ] The README covers technologies and decisions, run instructions, structure, and assumptions and limits.
