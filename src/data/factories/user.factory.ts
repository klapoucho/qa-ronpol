import { faker } from '@faker-js/faker';
import { uniqueId } from '#src/data/unique.ts';
import type { UserInput } from '#src/api/models/user.ts';

export function buildUser(overrides: Partial<UserInput> = {}): UserInput {
  const firstName = faker.person
    .firstName()
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 9);
  return {
    email: `qa.${uniqueId()}@example.test`,
    displayedName: `${firstName}_${uniqueId()}`,
    password: `Qa!${uniqueId()}Aa1`,
    ...overrides,
  };
}
