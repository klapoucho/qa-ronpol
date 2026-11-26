---
title: <one line, user-facing: what breaks for whom>
area: <ui|api>/<feature>/<sub-area>      # e.g. api/marketplace/buy; file: .qa/bugs/<group>/post-api-marketplace-buy--<slug>.md (UI-only bug: no method)
severity: <critical|major|minor|cosmetic>
kind: <functional|permission-gate|security|contract|ui-consistency|ux|performance>   # contract: the OpenAPI and the app disagree (testing-rules/api.md)
status: <open|fixed|wont-fix|unknown>
source: <own: run-id | link | user>
found: <YYYY-MM-DD>
last_checked: <YYYY-MM-DD> (<still reproduces|fixed|could not check>)
---

## Environment
- App URL: <…> · Platform: <Chromium 1366x768 | API>
- App version: <commit / version>
- Role / account: <role; never put passwords here>

## Steps to reproduce
1. …

## Expected
…

## Actual
…

## Contract (API bugs; delete for UI bugs)
- OpenAPI (`docs/api/openapi.json`): <what it documents for this operation: statuses, shape, auth>
- Live: <what the app does>
- Who is wrong: <the app | the docs | unclear>. Tests: <assert the live behaviour | expected failure until fixed>

## Evidence
- `<path in .qa/runs/<run-id>/artifacts/>`

## Frequency
<always | N/M attempts | once>

## Regression check
<shortest way to re-check this in a future run: a request, a screen + role, or a test path>

## Hint for developers (optional)
<gentle, only if obvious — never required>
