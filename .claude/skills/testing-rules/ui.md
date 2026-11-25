# UI testing rules

These augment `general.md` when testing the web UI with Playwright (CLI or tests).

## Feedback

- After every create, update or delete, a success message (toast, banner, inline) appears with specific text, not a generic "Success".
- Failures show an error message that helps the user.
- Toasts can disappear within a second. Don't sleep after the click that triggers one: poll for it straight away. Check your probe first on a path known to show the toast.

## Navigation

- After an action the user lands on the right page, and the URL reflects the state (ids, section).
- Browser Back behaves sensibly after a form submit.
- **A direct URL that redirects proves nothing about a permission gate.** The screenshot must show the target URL and the gated state, not a redirect every role gets.

## Forms

- Required fields are marked; validation messages appear on submit with missing fields, and inline where the app validates inline.
- Entered data survives a validation error (no data loss).
- Cancel/close discards changes; Save persists them (navigate away and back).
- Dependent fields show/hide correctly when their toggle changes.

## Lists with add/remove entries

- Add 1 entry, add many (more than fits the view), remove one including the last, reorder if supported.
- After saving, check ALL entries, not only the first and last.
- New entries may prepend or append — find the empty field, don't assume first or last.

## Loading states

- A loading indicator appears during slow operations, and the UI blocks double submits.

## Slow network

A weak connection exposes missing loading states, double submits and tests that wait for the wrong thing. Use it in manual testing of loading/saving flows and once per new UI test before the PR.

- **Throttle the connection (Chromium only, via CDP)** — about "slow 3G": 400 ms latency, 400 kbit/s each way. In a test or fixture:
  ```ts
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  ```
  Put it behind a fixture or a separate Playwright project (e.g. `chromium-slow-network`), not copied into tests. Manually: run the same code with `playwright-cli -s=<id> run-code "async page => { … }"`, then time a reload to confirm the throttle is still active.
- **Slow backend only (any browser)** — delay the app's API responses with routing:
  ```ts
  await page.route('**/api/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  ```
- **Offline:** `await page.context().setOffline(true)` — the app should show a clear error, not hang or lose the user's input.
- Under a slow connection, tests must still pass on web-first assertions alone. Raise a timeout only for a reason you can name, never to hide a missing wait.

## Locators (for automated tests)

- **Test ids first.** An explicit test id survives changes to text, translations and roles, so it is the most resilient locator. When the element has one, use `page.getByTestId('…')`. Playwright reads `data-testid` by default; if the app uses another attribute, set `testIdAttribute` in `playwright.config.ts` once instead of falling back to CSS.
- **No test id → user-facing locators:** `getByRole` with a name, then `getByLabel`, then `getByText`. CSS/XPath only as a last resort, never nth-index. Note each element that lacks a test id: QA and developers should add one.
- **A test id finds the element; it doesn't check what the user sees.** When the text, label or accessible name is part of the requirement, assert it explicitly (`toHaveText`, `toHaveAccessibleName`, `toHaveRole`) — a test-id locator alone passes when a button loses its label.
- Test ids must be unique where you use them. A test id repeated per row (`product-card`) is a container: scope to the right row first, then go inside it.
- Scope to a container (a row, a dialog) before asserting, so a match elsewhere on the page can't satisfy the test.
- Hidden tabs, off-screen months and virtualised lists may keep extra copies in the DOM: scope to the visible one.
- Virtualised lists keep only the rendered rows in the DOM; counting DOM nodes is not counting items.

## Visual and accessibility checks

- Measure, don't eyeball: read computed styles or element boxes and compare against the rule (alignment, contrast ratio 4.5:1 for text, 3:1 for UI parts).
- Move the mouse away and blur the focused element before measuring — hover and focus change colours.
- Check what the story claims at the viewport the tests use, and say which viewport you measured at.
