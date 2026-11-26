---
title: Letters outside the Polish alphabet (é, ü, ß) and decomposed Polish letters are refused as invalid description characters
area: api/marketplace/offers
severity: minor
kind: functional
status: open
source: "own: 2026-11-26-issue-13-marketplace-seller-lists-an-item"
found: 2026-11-26
last_checked: 2026-11-26 (still reproduces)
---

## Environment
- App URL: http://localhost:3000/marketplace.html · Platform: Google Chrome 158.0.8127.88 via playwright-cli 0.1.24, 1280x720, and API
- App version: Rolnopol 1.126.0 (Docker image `jaktestowac/rolnopol:1.126.0`)
- Role / account: seller qa_rvsell_a428ca2c (fresh)

## Steps to reproduce
1. Marketplace → Create Offer → Field → a free field → price 4.56 → description `Café Müller Straße` → Create Offer.

## Expected
AC-1 allows "letters (including Polish)", so é, ü and ß are accepted. The same goes for Polish letters typed or pasted in decomposed form (`a` + combining ogonek), which look the same as `ą`.

## Actual
toast "Description contains invalid characters" (400) in both cases. Only A–Z and the 18 Polish letters pass. The message does not say which character is wrong (report problem 7).

## Contract
- OpenAPI (`docs/api/openapi.json`): `MarketplaceOfferCreate.description` is a plain `string`, no pattern or length documented.
- Live: only A–Z, the 18 Polish letters, digits, `_`, whitespace and `. , ; : ! ( ) -` pass.
- Who is wrong: unclear — AC-1 says "letters (including Polish)"; needs the author's decision. Tests: none until decided.

## Evidence
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R3-description-charset-cases.jsonl`
- `.qa/runs/2026-11-26-issue-13-marketplace-seller-lists-an-item/artifacts/review/R3b-non-polish-letters-refused.png`

## Frequency
3/3

## Regression check
`POST /api/v1/marketplace/offers` with description "Café Müller Straße" → expect 200 (or AC-1 narrowed to Polish letters).

## Hint for developers (optional)
Normalise to NFC before validating.
