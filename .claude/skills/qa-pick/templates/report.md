# <story title> — <PASS | FAIL | PASS WITH FINDINGS | BLOCKED>

**Source:** <story text | issue URL + PR URL> · **Run:** <run-id> · **Env:** <app URL> · **Platforms:** <web Chromium | API> · **App version:** <commit / version> · **Date:** <YYYY-MM-DD>
**Roles tested:** <list> · **Skipped:** <role — why>

## Problems (user-facing)
<!-- One block per problem, most severe first. The coordinator files each one in .qa/bugs/ afterwards — testers don't. -->
### 1. <what breaks for whom> — <severity>
- **Steps:** 1. … 2. …
- **Expected:** …
- **Actual:** …
- **Evidence:** <artifacts/…png | artifacts/…json>
- **Env/role:** <if different from the header>
- **Hint (optional):** …

## Test cases
<!-- Every case executed (same ids as results.json items), failures included. Requirement = the acceptance criterion it verifies, or "assumption". -->
| # | Result | Role | Tool | Case | Requirement | Evidence |
|---|---|---|---|---|---|---|
| 1 | PASS / FAIL / NOT_RUN | … | playwright-cli / API / script | … | AC … | artifacts/… |

## Console
<!-- UI runs: every browser console error explained or reported. -->

## Not verified / blocked
- <item> — <reason>

## Assumptions
- <what was unclear, what you chose and why>

## Regression checks of known bugs
- <bug file> — <still reproduces | fixed | n/a>

## Automation
<branch / PR, or "not automated — why">

## Lessons applied
<one line each>
