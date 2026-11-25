import { faker } from '@faker-js/faker';
import type { FieldInput } from '#src/api/models/field.ts';
import { uniqueId } from '#src/data/unique.ts';

export function buildField(overrides: Partial<FieldInput> = {}): FieldInput {
  return {
    name: `QA field ${uniqueId()}`,
    area: faker.number.float({ min: 0.5, max: 100, fractionDigits: 2 }),
    ...overrides,
  };
}
