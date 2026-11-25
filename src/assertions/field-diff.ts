export type FieldMismatch = {
  field: string;
  expected: string | RegExp;
  actual: string | undefined;
};

function matches(expected: string | RegExp, actual: string | undefined): boolean {
  if (actual === undefined) return false;
  // search() ignores lastIndex, so a /g or /y RegExp gives the same answer on every poll.
  return typeof expected === 'string' ? actual.trim() === expected.trim() : actual.search(expected) !== -1;
}

export function diffFields(
  expected: Record<string, string | RegExp>,
  actual: Record<string, string | undefined>,
): FieldMismatch[] {
  return Object.entries(expected)
    .filter(([field, want]) => !matches(want, actual[field]))
    .map(([field, want]) => ({ field, expected: want, actual: actual[field] }));
}

export function formatMismatches(mismatches: FieldMismatch[]): string {
  return mismatches
    .map(
      ({ field, expected, actual }) =>
        `  ${field}: expected ${String(expected)}, received ${actual === undefined ? 'undefined' : JSON.stringify(actual)}`,
    )
    .join('\n');
}
