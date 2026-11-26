/** What one field shows: undefined when no element matched, `visible: false` when it is in the DOM but hidden. */
export type FieldRead = { text: string; visible: boolean } | undefined;

export type FieldMismatch = {
  field: string;
  expected: string | RegExp;
  actual: FieldRead;
};

function matches(expected: string | RegExp, actual: FieldRead): boolean {
  // A hidden field never matches: the user does not see its text.
  if (!actual?.visible) return false;
  const { text } = actual;
  // search() ignores lastIndex, so a /g or /y RegExp gives the same answer on every poll.
  return typeof expected === 'string' ? text.trim() === expected.trim() : text.search(expected) !== -1;
}

export function diffFields(
  expected: Record<string, string | RegExp>,
  actual: Record<string, FieldRead>,
): FieldMismatch[] {
  return Object.entries(expected)
    .filter(([field, want]) => !matches(want, actual[field]))
    .map(([field, want]) => ({ field, expected: want, actual: actual[field] }));
}

function describeRead(actual: FieldRead): string {
  if (actual === undefined) return 'undefined';
  const text = JSON.stringify(actual.text);
  return actual.visible ? text : `${text} (hidden)`;
}

export function formatMismatches(mismatches: FieldMismatch[]): string {
  return mismatches
    .map(
      ({ field, expected, actual }) =>
        `  ${field}: expected ${String(expected)}, received ${describeRead(actual)}`,
    )
    .join('\n');
}
