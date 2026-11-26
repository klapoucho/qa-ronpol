import { errors, type Locator } from '@playwright/test';
import { diffFields, formatMismatches, type FieldRead } from '#src/assertions/field-diff.ts';

export interface FieldView<K extends string = string> {
  readonly fields: Readonly<Record<K, Locator>>;
}

const RETRY_DELAY_MS = 100;
// A read never gets less than this, so the last read before the deadline is a real one.
const MIN_READ_MS = 250;
const MAX_READ_MS = 1000;

async function readField(locator: Locator, timeout: number): Promise<FieldRead> {
  try {
    const text = await locator.innerText({ timeout });
    // innerText also returns the text of an element hidden by CSS (display:none on it or on an
    // ancestor, as in an unopened tab), so visibility is checked apart from the text.
    const visible = await locator.isVisible();
    return { text, visible };
  } catch (error) {
    // Only "not found in time" counts as a missing element. Anything else (strict-mode
    // violation, closed page or context) is a real error and must surface with its cause.
    if (error instanceof errors.TimeoutError) return undefined;
    throw error;
  }
}

// Reads only the named fields: an unasked field that is missing or ambiguous must not cost time or fail.
async function readFields(
  fields: Record<string, Locator>,
  names: readonly string[],
  timeout: number,
): Promise<Record<string, FieldRead>> {
  const entries = await Promise.all(
    names.map(async (name) => {
      const locator = fields[name];
      if (!locator) throw new Error(`toShowFields: the view has no field "${name}"`);
      return [name, await readField(locator, timeout)];
    }),
  );
  return Object.fromEntries(entries) as Record<string, FieldRead>;
}

export async function toShowFields<K extends string>(
  this: { isNot: boolean; timeout: number },
  view: FieldView<K>,
  expected: Partial<Record<K, string | RegExp>>,
  options: { timeout?: number } = {},
) {
  if (this.isNot) {
    throw new Error('toShowFields does not support .not: assert on the fields that must differ.');
  }
  const timeout = options.timeout ?? this.timeout;
  const wanted = expected as Record<string, string | RegExp>;
  const deadline = Date.now() + timeout;
  const names = Object.keys(wanted);

  for (;;) {
    const remaining = deadline - Date.now();
    const actual = await readFields(
      view.fields,
      names,
      Math.max(Math.min(remaining, MAX_READ_MS), MIN_READ_MS),
    );
    const mismatches = diffFields(wanted, actual);
    if (mismatches.length === 0) {
      return { pass: true, message: () => 'all fields match' };
    }
    if (Date.now() >= deadline) {
      return {
        pass: false,
        message: () => `Fields do not match:\n${formatMismatches(mismatches)}`,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}
