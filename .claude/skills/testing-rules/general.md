# General testing rules

These rules apply to ALL testing — UI and API, manual and automated. When challenging a test plan, check every item below.

## Test design techniques

### Boundary value analysis
- For every numeric input test: minimum, minimum-1, minimum+1, maximum, maximum-1, maximum+1.
- For string length limits test: empty, 1 char, max length, max length+1. Build boundary strings in code and check their length before sending (`s.length === 300`): a hand-repeated alphabet is rarely the length you meant, and a wrong length looks like an app bug.
- Compare money as numbers rounded to the currency's precision (`Math.round(x * 100)`) when the test computes the expected amount: float sums like `5.55 + 6.66 + 40` differ from the same total added in another order. When the expected amount is a written-out literal (`16.72`) and the app is supposed to round, compare exactly: rounding in the assertion would hide a server that stops rounding (`40.17 - 23.45` is `16.720000000000002`).
- For date ranges test: start, end, one day before start, one day after end.

### Equivalence partitioning
- Identify valid and invalid partitions for each input and test one representative of each.
- Common partitions: empty, valid, too long, wrong type, special characters.

### Decision tables
- When several inputs interact (role + state + action), map the combinations and focus on the edges most likely to break.

## Input validation

Always try:
- **Empty/blank:** `""`, whitespace-only `"   "`, `null`
- **Special characters:** ``!@#$%^&*()_+-=[]{}|;:'",.<>?/~` ``
- **XSS payloads:** `<script>alert('xss')</script>`, `<img onerror=alert(1) src=x>`, `javascript:alert(1)`
- **SQL/NoSQL injection:** `' OR 1=1 --`, `{"$gt": ""}`
- **Unicode:** emoji, accented characters, RTL, CJK
- **Length extremes:** 1 character, 1000+ characters
- **Numbers in text fields:** `12345`, `-1`, `0`, `99999999`
- **HTML entities:** `&amp;`, `&lt;`, `&gt;`, `&quot;`

## State verification

- **Create → exists:** the new item appears in the list/view and every submitted field is saved, not just "it was created".
- **Update → persisted:** reload or re-fetch and check the change; check that unchanged fields were not touched.
- **Delete → gone:** the item no longer appears; related data is handled (cascade, cleanup, or a proper error).
- **Lists and filters:** check with 0, 1 and many items.

## Error handling

- Error messages are user-friendly (no stack traces or raw codes) and don't leak internals (paths, queries).
- The app recovers after an error (no broken state, no lost input).

## Permissions

- If a feature is role-restricted, check that roles without access are refused — in the UI and on the API.
- A logged-out user alone does not test a permission gate. Also test a logged-in user whose role lacks just that permission, and another user's data (ids from another account in the URL or body).

## Tracing checks to requirements

- Every check names the acceptance criterion it verifies, or is marked **assumption (not in requirements)**. Don't invent requirements; label them.
- Every PASS needs a negative control that would have failed if the feature were partly broken: the forbidden role is refused, data that must be filtered out is absent.

## Evidence shows the claim

- Open every screenshot you cite and check that it shows what the report says. A snapshot or DOM query can contain text the user never sees (covered by an overlay, zero-size, transparent). When the DOM and the pixels disagree, the pixels are what the user experiences.

## Two-phase validation (input → output)

- **Input:** the UI/API accepts or rejects the input correctly.
- **Output:** the saved data actually works — it is returned by the API, shown in the list, rendered.
- Both phases must pass: input validation passing does not prove the output works.

## Code in a test body (automated tests)

Lint and the formatter cover syntax. These rules cover what they cannot see; the project's own conventions document (QA settings name it) adds its fixtures, clients and file layout.

- **Name things by their role in the scenario:** `seller`, `buyer`, `stranger`, `offer`, `cancelledOffer`; never `user1`, `data`, `res` or `tmp`. The result of the call under test is `response`, or the domain noun when the test goes on to use it (`purchase`).
- **One behaviour per test.** One `When`; a second one only in a journey whose later step needs the earlier one (open the list, then go to page 2). Two rules that can break separately are two tests.
- **No logic in the body:** no `if`, `try`/`catch`, helper closures or loops over expected structures. The one loop allowed is the one that generates parametrized tests from a data file. When a test needs logic, it belongs in the framework code.
- **Write expected values out.** `expect(balance).toBe(76.55)`, not `funds - price`: a test that repeats the app's formula repeats its bug. Derive a value only from what the test itself sent or created (`offer.id`, `seller.id`).
- **A value picked on purpose has a name or a reason.** Used in several places or across tests: a constant at the top of the file with a comment saying why this value. Used once: inline, with the reason in the block's comment.
- **Override only what the test is about.** Factories fill the rest, so the reader sees which inputs matter.
- **Run in parallel only what is independent:** creating two users, reading two states. Steps that depend on each other stay in order, and the call under test never shares a `Promise.all` with anything.
- **Assert a whole object in one `expect`** (`toEqual`, `toMatchObject`) when its fields belong together; separate `expect`s when they are separate outcomes, each under its own comment line.
- **A failure says what broke without opening the code.** The runner prints the failing line, so the expression inside `expect` must name what is checked: `expect(await seller.balance()).toBe(133.45)` does, `expect(ok).toBe(true)` and `expect(list.length).toBe(1)` do not. Assert on the object or the locator itself, or give the `expect` a message: `expect(count, 'offers on page 2').toBe(1)`.
- **Nothing the result depends on is hidden.** Every user, record and amount the `Then` checks is created in the test's own `Given`. A fixture may do what every test needs and none asserts on (log in, answer page-load calls); it never creates the data a test checks.
- **Readable before DRY.** The same three setup lines in two tests are fine. Extract a helper into the framework only when several tests repeat the same steps and the helper's name says more than the lines did; never extract assertions out of a test.
- **Assert what the user or the API client gets:** visible text, state, a response body, stored data. Never a CSS class, the DOM structure or the name of an internal function.

## Comments in a test body (automated tests)

Every test, API and UI alike, reads top to bottom as one scenario, and its comments mark the parts:

- **`// Given`, `// When`, `// Then`** start the three blocks, one blank line between them. Leave `Given` out only when the test prepares nothing. A test that acts twice repeats `// When` and `// Then`.
- **The comment says what the block is about, in the domain's words:** `// Given an offer its seller cancelled, and a buyer with money to spend`, never a bare `// Given`. In a parametrized test it describes what every row shares; the row's title says the rest.
- **A long `Then` gets one short lowercase line per outcome** (`// the field belongs to the buyer`), so a reader sees what was checked without reading every `expect`.
- **A "why" comment only where the code cannot say it:** a value picked on purpose (a boundary, a float trap, a price one cent too high), data that rules out another cause of the same answer, a workaround for the app (a slow operation, a queue), a known bug with its bug file.
- **No comment that repeats the line under it** (`// Then the status is 400` above `expect(status).toBe(400)`), and no commented-out code.

## Assertion integrity (automated tests)

### Write assertions that can fail

An assertion that always passes is worse than none — it creates false confidence. **Poison-test protocol**, run after writing new assertions:

1. **Wrong expected value:** temporarily change the expected value (in the test data file or the test), run the test, confirm it FAILS, restore.
2. **Partial breakage** — at least one per new test: break the *scenario*, not just the expected value — skip a step, seed half the data, run as the wrong role, point at the wrong row. The test must fail. A test that only fails on a wrong literal can still pass while the feature is half broken.
3. **Read the failure, not the summary.** Confirm the failure names the assertion you poisoned, not a compile or setup error.

**"Changed by" needs a non-zero start.** When a test asserts that a balance, counter or quantity rises or falls by an amount, start every actor at a non-zero, non-round value. From 0, "rose by X" and "was set to X" give the same result.

**"Did it pick the right one?" needs a wrong one to pick.** When a test checks that the app opened, selected or revealed a specific record, seed at least two candidates and target one that isn't first.

### Common anti-patterns

- **Vacuous truth:** `expect(expected.every(i => actual.includes(i))).toBe(true)` passes when `expected` is empty. Prefer `expect(actual).toEqual(expected)`.
- **Broad locators:** a locator matching every row lets an assertion pass on the wrong row. Scope to the row first (`page.getByRole('row', { name: … })`), then assert inside it.
- **Fixed waits:** `waitForTimeout` hides timing bugs and slows the suite. Wait for a state with web-first assertions (`await expect(locator).toBeVisible()`) or for a response (`page.waitForResponse`).
- **One-shot reads:** `isVisible()`, `textContent()` or `count()` inside `expect(...)` read once and do not wait. Use the web-first form (`await expect(locator).toBeVisible()`, `toHaveText`, `toHaveCount`). A one-shot read belongs only inside a matcher that retries it.
- **Setup failures under `test.fail()`:** a test marked as an expected failure counts any failure, including a broken seed, as "expected". Seed in fixtures or `beforeEach` and make seeding errors throw with a clear message, so a broken seed fails loudly.

## Committed tests on the changed surface

A change can break the suite without breaking the product. Grep the suite for the screens, locators and page-object methods the change touches, run those tests, and compare with one control run on the main branch. A test that passes on main but fails on the change is a finding.

## Before opening a PR with automated tests

Filter noise before it reaches a human: cheap, rule-shaped feedback is fixed by you, so the reviewer only decides what no rule can. In this order:

1. **Deterministic gate** — run the gate commands from the project's QA settings on every new or changed test file: type check, lint, and a listing of the tests without running them. For Playwright Test with TypeScript, for example:
   ```bash
   npx tsc --noEmit
   npx eslint <files>
   npx playwright test --list <files>
   ```
   All exit 0, and the listing shows the number of tests you expect. Then run the new tests by path. Don't continue until this passes.
2. **Stability (flakiness)** — UI and API tests alike. Run the new tests 10 times, in parallel, with retries off, so a retry can't hide a flake:
   ```bash
   npx playwright test <files> --repeat-each=10 --retries=0 --workers=4
   ```
   Every run must pass. A single failure is a flaky test: find the cause (a missing wait, shared data between workers, order dependence, a time-dependent value) and fix it — never add retries or fixed waits to make it pass. Then rerun the 10.
   When the cause is the app itself (a shared lock or queue that parallel tests overload, proven with a trace), don't weaken the test or override the app: file the bug, report to the coordinator with the numbers, and isolate the test as the user decides (this repo: UI tests that move money are tagged `@ledger` and run alone in the `ui-ledger` project, see `docs/app-under-test.md`).
   **UI tests also run once on a slow connection** (see `ui.md` → "Slow network"). A test that passes only on a fast connection is waiting for the wrong thing. Record both results (passes out of 10, slow-network pass) in the test intent card.
3. **`/simplify`, then `/code-review`** on the branch; fix the findings. Commit first and pass the level and branch explicitly (e.g. `/code-review medium <branch>`); a review that reports an empty diff did not see your changes, so rerun it.
4. **Test review** — a subagent with fresh context that gets only the story, the test plan and the diff (not your reasoning) and answers, for each new test:
   - Why does this test exist — which acceptance criterion does it cover?
   - What regression would it catch?
   - Does the assertion prove what the test name claims?
   - Does it rely on an assumption that is not in the requirements?
   - Is this the right level? Default to the lowest level that catches the regression (API before UI); UI only for what needs the real screen.
   - Does it duplicate an existing test (grep the suite) or another new one?
   - Would it still pass if the feature were partly broken?
   - Does it follow "Code in a test body" and "Comments in a test body" above, and the project's conventions document?

   Fix what can be fixed. What needs a human decision goes into the PR description.

The PR description carries a **test intent card**, one row per test:

| Test | Why (acceptance criterion) | Regression it catches | Poison that failed it | Stability (x/10, slow network) | Level + why | Overlaps with |
|---|---|---|---|---|---|---|

followed by **Decisions for the reviewer** — the open points from step 4 (or "none").
