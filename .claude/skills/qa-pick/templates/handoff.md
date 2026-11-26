# <story title> — handoff to the test writer

**Run:** <run-id> · **Env:** <app URL> · **App version:** <…> · **Verdict:** <…>

## Seed recipe
<!-- What the tests must create, in order, with the calls that worked. Point to the scripts. -->
- Scripts: `{RUN_DIR}/scratch/<script>` — <what it seeds>
- Roles: <role → how created (endpoint, payload)>
- Gotchas: <required fields, async delays, ordering; seed calls that must NOT run in parallel (per-user races); how long each write takes alone and with ~4 in parallel, and the page's own request timeout, when they are close>

## Verified locators / endpoints
<!-- Only what you saw work.
     UI: the test id first (`getByTestId`); for elements without one, role + accessible name, and mark them "no test id". Never nth-index or CSS structure. Name any overlay/spinner that intercepts the first click. Give the URL a click lands on as observed, and the state a FRESH user starts in. Page readiness: name the data a page loads once on start that later controls are built from (dropdowns, lists) and the responses a test must wait for before using them — on a slow network an early pick can leave the control empty for good. Note any response large enough to matter on a slow network (size, time).
     API: method + path + real payload + response shape (trimmed). List every Set-Cookie / Location a response carries when the test depends on them.
     Collapsed, virtualised or "+N more" content: say HOW a test reads the hidden items and what identifies each one. For a select/focus/reveal check, say how many candidates the seed needs to prove the RIGHT one was picked. -->
| What | Locator / request | Response / state | Note |
|---|---|---|---|

## Automation candidates
<!-- Check id = results.json items id. Level: the lowest that catches the regression (API before UI).
     The negative control must isolate the ONE factor the check is named after (an "expired token" case must be validly signed, else the signature explains the 401). If an earlier layer answers first (auth before validation), say which property the assertion cannot observe.
     A criterion that lists exclusions needs each exclusion as its own expected value, seeded so it would appear in the result if the rule broke.
     Pixel geometry: say the viewport you measured at and state the rule, not only the px you saw. -->
| Check | Acceptance criterion | Level | Expected values | Negative control used manually |
|---|---|---|---|---|

## Do not automate
- <check> — <why: manual-only, visual, already covered by `<test path>`, flaky by nature>

## Open findings
<!-- Tests must not assert the broken behaviour: mark them as expected failures with the bug title, or leave them out. -->
- <bug file> — <what is broken, which check it touches>

## Traps
- How to compare read-backs deterministically (list order, attribute order, timestamps).
- <symptom → cause → what worked>
