---
title: Updating the profile with displayedName as an array answers 500
area: api/users/profile
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-15-marketplace-browse-renders-api-data"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: API (Node fetch)
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: registered user (fresh)

## Steps to reproduce
1. `PUT /api/v1/users/profile { "displayedName": ["x"] }` with a valid token.

## Expected
400 with a validation message.

## Actual
500 "displayedName.trim is not a function". Found outside the story's scope (profile, not Marketplace) while the reviewer probed open text on the offer card.

## Contract
- OpenAPI: not checked in this run.
- Live: 500.
- Who is wrong: the app (crafted input should get 400). Tests: expected failure until fixed.

## Evidence
- `.qa/runs/2026-11-26-issue-15-marketplace-browse-renders-api-data/artifacts/review/R1-R3-api-open-text.json`

## Frequency
1/1, deterministic

## Regression check
`PUT /api/v1/users/profile` with an array `displayedName` must answer 400.
