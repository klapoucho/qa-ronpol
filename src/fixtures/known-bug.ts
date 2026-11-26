import { test } from '@playwright/test';

/** An open bug of the app, described in a file under `.qa/bugs/`. */
export type KnownBug = { title: string; file: string };

/**
 * Marks the running test as an expected failure because of an open app bug and links the bug file
 * in the report. Playwright then fails the test once the bug is fixed, so the mark gets removed.
 *
 * Call it after the setup, right before the steps the bug breaks: a setup that fails for another
 * reason then still fails the test. With `undefined` it does nothing, for cases in a table where
 * only some rows hit a bug.
 */
export function expectFailureBecauseOf(bug: KnownBug | undefined): void {
  if (!bug) return;
  test.info().annotations.push({ type: 'bug', description: `${bug.title} (${bug.file})` });
  test.fail(true, bug.title);
}
