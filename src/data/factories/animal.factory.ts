import { faker } from '@faker-js/faker';
import type { AnimalInput } from '#src/api/models/animal.ts';

// Keys of GET /api/v1/animals/types. No fieldId: an animal group on a field cannot be offered.
const TYPES = ['cow', 'pig', 'sheep', 'goat', 'duck'];

export function buildAnimal(overrides: Partial<AnimalInput> = {}): AnimalInput {
  return {
    type: faker.helpers.arrayElement(TYPES),
    amount: faker.number.int({ min: 1, max: 20 }),
    ...overrides,
  };
}
