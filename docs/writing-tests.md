# Writing tests

Conventions for adding a test or a feature to the framework.

**Naming.** Files in kebab-case; specs `*.spec.ts`, parametrized cases `*.params.ts` next to their spec; classes
in PascalCase named after the screen or resource (`MarketplacePage`, `MarketplaceApi`). Test titles state the
behaviour: `buyer cannot buy an offer above their balance`. Imports use the alias: `#src/<path>.ts`.

**Shape of a test.** A test reads top to bottom as one scenario: prepare the data, do the one thing the test is about,
check the outcome, with `// Given`, `// When` and `// Then` marking the parts. A reader who does not know the
framework should understand a test without opening another file. The rules for the code and the comments in a test
body are in `.claude/skills/testing-rules/general.md` ("Code in a test body", "Comments in a test body"); the
test-writing agent and its reviewer read the same file.

**Checklist** for a new feature (`<feature>` is, for example, `marketplace`):

1. Tests go in `tests/api/<feature>/`, `tests/ui/<feature>/` or `tests/ui-mocked/<feature>/`, by level. Import
   `test` and `expect` from `#src/fixtures/index.ts`, never from `@playwright/test`. No raw HTTP calls, raw
   selectors or data literals in a test.
   `src/fixtures/index.ts` exports only `test` and `expect`; import everything else a test needs from its own
   module (`#src/api/clients/...`, `#src/data/factories/...`, `#src/mocks/...`, `#src/ui/pages/...`). A new page
   object becomes a fixture (for example `marketplacePage`) in `src/fixtures/ui.fixtures.ts`. ESLint rejects
   value imports from `@playwright/test` in specs.
2. **API client:** one class per resource in `src/api/clients/`, extending `BaseApi`. Add it to `TestUser.api`
   (`src/fixtures/test-user.ts`); tests call it as `user.api.<resource>.<method>()`, and without a user through
   the `anonymousApi` fixture. Responses are `ApiResponse` objects: `status`, `error` and `data`, which throws a
   clear error when the call failed.
3. **Schemas:** zod schemas in `src/api/models/`, types inferred from them. Keep each endpoint's real wire
   format: the envelope `{ success, timestamp, data | error }` for most endpoints, bare objects where the app
   returns them (`/api/version`, `/api/v1/statistics`).
4. **API spec layout:** one `test.describe` per endpoint, titled `<METHOD> <path>`, with one nested
   `test.describe` per status; the rule is in `.claude/skills/testing-rules/api.md` ("Automated API specs"). `npm
   run coverage:api` reads these groups (D-18).
5. **Data:** a factory in `src/data/factories/` that builds a valid entity with unique values; tests override
   only what matters. Users come from the `createUser` fixture, which returns a `TestUser`. Its shortcuts prepare
   data (`createField`, `offerField`, `addFunds`) and read state (`balance`, `fields`, `myOffers`); they throw
   when the app refuses, so a broken setup never looks like a tested refusal. The call a test is about goes
   through `user.api`, which returns the response, refused or not.
6. **UI:** a page object per screen in `src/ui/pages/`, repeated parts as components in `src/ui/components/`.
   They expose actions and locators, no assertions. Which locator to pick is in
   `.claude/skills/testing-rules/ui.md` ("Locators"): test ids first. Log in with `createUser` + `loginAs`
   (cookies, no login form).
7. **Matcher:** only when a UI check covers many fields or several sources (an offer card, a filled form).
   Register it in `src/assertions/index.ts`; it reports every mismatching field and retries when it reads the UI.
   For plain API data, `toEqual` or `toMatchObject` on the whole object is enough; to prove a refused call
   changed nothing, read `user.everything()` before and after it and compare the two.
8. **Mocks:** `ui-mocked` tests get the shared page-load calls (`authorization`, `feature-flags`,
   `/api/version`) answered already. Add a `src/mocks/handlers/<feature>.ts` for the feature's own endpoints,
   with payloads from `src/mocks/payloads/` built from the same zod schemas, in each endpoint's real wire format.
   Any `/api/` request no handler serves fails the test, with its method and path.
9. **Cases:** when several cases share one test body, put them in `<name>.params.ts` as a typed array of plain
   data, each with a readable title used in the test name. No functions in a params file: a case that needs its
   own setup is a test of its own.
10. **Tags:** `@smoke` for the minimal set that proves the app works, `@critical` for paths that move money,
    `@ledger` for a UI test that moves money through the page (it then runs alone in the `ui-ledger` project; see
    [the app's money queue](app-under-test.md)). Never tag the level; the project says it.
11. **Known app bug:** call `expectFailureBecauseOf({ title, file })` (`src/fixtures/known-bug.ts`) after the
    setup, with the bug's file in `.qa/bugs/`. The test is then an expected failure with a link in the report.
12. **Before the commit:** `npm run check`, then run the new test; break its expected value and one step of its
    scenario (the poison test in `.claude/skills/testing-rules/general.md`) and confirm it fails both times.

