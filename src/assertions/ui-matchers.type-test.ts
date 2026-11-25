// Type-only check, never executed (not a *.spec.ts, so Playwright ignores it); `npm run typecheck`
// compiles it. It pins that toShowFields checks field keys against the FieldView.
import { expect } from '#src/assertions/index.ts';
import type { FieldView } from '#src/assertions/ui-matchers.ts';

declare const view: FieldView<'email' | 'displayedName'>;

export async function typeChecks(): Promise<void> {
  await expect(view).toShowFields({ email: 'a', displayedName: /b/ });
  await expect(view).toShowFields({ email: 'a' }, { timeout: 1000 });
  // @ts-expect-error unknown field key
  await expect(view).toShowFields({ emial: 'typo' });
}
