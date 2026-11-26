---
title: Creating several fields at once as the same user answers every request with the last field's id and name
area: api/fields
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-14-marketplace-buyer-buys-an-offer"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/api/v1 · Platform: API (Node fetch, `X-Synthetic-Token`)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: fresh user

## Steps to reproduce
1. As one user, send three `POST /api/v1/fields` at the same moment, with names "… 1", "… 2", "… 3".

## Expected
Each response returns the field it created: three different ids, each with its own name.

## Actual
All three answer 201 with `id: 1930` and the third request's name. The user's fields are 1928, 1929 and 1930, so the first two callers got the wrong id. Controls: the same user creating one after another gets 1931 and 1932; two different users creating at once get 1933 and 1934.

## Contract (API bugs; delete for UI bugs)
- OpenAPI (`docs/api/openapi.json`): not checked for this case; a create is expected to return the created resource.
- Live: concurrent creates by one user return the last created field.
- Who is wrong: the app. Tests: create a user's fields one at a time until fixed.

## Evidence
- `.qa/runs/2026-11-26-issue-14-marketplace-buyer-buys-an-offer/artifacts/writer/post-fields-concurrent-same-user-ids.json`

## Frequency
1/1 (with controls)

## Regression check
`Promise.all` of three `POST /api/v1/fields` for one user: the three response ids must differ and match the stored fields.
