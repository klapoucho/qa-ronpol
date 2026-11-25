# API testing rules

These augment `general.md` when testing HTTP endpoints.

## Discover before testing

- Find the endpoint's contract first: the app's API docs (Swagger/OpenAPI), the source, or the network log of the screen that calls it. Don't assume full CRUD — some resources have no DELETE or no PUT.
- Note required vs optional fields, allowed values for enum fields, length limits and read-only fields before you design inputs.

## Status codes

Expected by operation: GET 200 · POST 201 (or 200 if documented) · PUT/PATCH 200 · DELETE 204/200 · invalid input 400/422 · no auth 401 · wrong role 403 · missing resource 404 · method not allowed 405.

Always check:
- the happy path code,
- 400/422 for invalid input (missing required fields, wrong types),
- 401 without credentials,
- 403 for a role that lacks permission,
- 404 for an id that doesn't exist (and for another user's id when the app hides existence).

## Response bodies

- Success: every expected field is present, with the right type and format (ids, ISO 8601 dates), nested objects included.
- Errors: a meaningful message that names the right field, with no internal details (stack traces, queries, file paths).
- Assert the body, not only the status: a 200 with the wrong body is a failure.

## Authentication and authorization

- Each protected endpoint: valid credentials, expired, missing, malformed.
- Cross-user access: user A cannot read or change user B's resources by id (in the URL, the body, and nested objects).
- A negative-role check first proves the user is otherwise valid (it can read its own data), so the refusal is for the right reason.
- Logout and role changes: an old token or session must stop working where the app says it does.

## Data integrity

- After POST: GET the created resource and compare every field.
- After PATCH/PUT: GET it and check that only the intended fields changed.
- After DELETE: GET returns 404; lists no longer contain it.
- PUT and some PATCH implementations **replace** nested objects or lists instead of merging them: read the current value, change it, send the full value back — and test that behaviour explicitly.

## Pagination, sorting, filtering

- Pagination: first page, last page, out-of-range page; every item reachable exactly once; totals match.
- Filtering: a matching filter, a filter that matches nothing, an invalid filter value.

## Dates and time zones

- When a value is shown on a local day, test both sides of the day boundary: a local time whose UTC date is the next day and one whose UTC date is the previous day.

## Validation rules shared by several fields

- When one rule covers several fields, put the invalid value in **every** covered field in one request and assert the error on each — a check on one field passes when the validator is missing on the others.
- When the exact error body matters (message count, field key), compare it exactly, not with a "contains" check.
