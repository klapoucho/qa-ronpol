import { expect as baseExpect } from '@playwright/test';
import { toShowFields, type FieldView } from '#src/assertions/ui-matchers.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      /** Retries until every listed field of a FieldView matches; fails listing all mismatches. */
      toShowFields(
        expected: T extends FieldView<infer K> ? Partial<Record<K, string | RegExp>> : never,
        options?: { timeout?: number },
      ): R extends Promise<unknown> ? R : Promise<void>;
    }
  }
}

// The cast drops the signature Playwright infers from `extend` (it widens the keys to string, so
// a typo compiles). The strict signature is the declaration above, which `expect` already carries.
export const expect = baseExpect.extend({ toShowFields }) as unknown as typeof baseExpect;

export type { FieldView };
