import { faker } from '@faker-js/faker';
import type { OfferInput, OfferItem } from '#src/api/models/marketplace.ts';
import { uniqueId } from '#src/data/unique.ts';

// An offer for an item the seller owns; the app allows letters (Polish too), digits, whitespace
// and . , ; : ! ( ) - _ in the description, at most 300 characters.
export function buildOffer(item: OfferItem, overrides: Partial<OfferInput> = {}): OfferInput {
  return {
    ...item,
    price: faker.number.float({ min: 1, max: 500, fractionDigits: 2 }),
    description: `QA offer ${uniqueId()}`,
    ...overrides,
  };
}
