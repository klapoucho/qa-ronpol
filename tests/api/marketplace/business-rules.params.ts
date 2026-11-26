import type { OfferInput } from '#src/api/models/marketplace.ts';
import type { KnownBug } from '#src/fixtures/known-bug.ts';

// Cases of business-rules.spec.ts. Data only: the spec shows what each case does.

// Every character the description allows: all 18 Polish letters, digits, `_`, spaces and . , ; : ! ( ) -
const ALLOWED_CHARACTERS = 'Pole ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ 0123456789 . , ; : ! ( ) - _ ';

type ValidOffer = {
  title: string;
  offer: Pick<OfferInput, 'price' | 'description'>;
};

export const validOffers: ValidOffer[] = [
  {
    title: 'the lowest price, 0.01, and no description',
    offer: { price: 0.01, description: undefined },
  },
  {
    title: 'the longest description, 300 characters, with every allowed character',
    offer: { price: 12.34, description: ALLOWED_CHARACTERS.repeat(6).slice(0, 300) },
  },
];

type InvalidOffer = {
  title: string;
  /** What the case changes in an otherwise valid offer. The price may be a string: the wrong type. */
  offer: { price?: number | string; description?: string };
  error: string;
  /** An open app bug that makes this case fail today. */
  bug?: KnownBug;
};

export const invalidOffers: InvalidOffer[] = [
  {
    title: 'price 0',
    offer: { price: 0 },
    error: 'Price must be greater than 0',
    // Today the app answers 400 "Missing required fields: itemType, itemId, price".
    bug: {
      title:
        'Create offer refuses price 0 as a "missing field" and accepts malformed price and description values',
      file: '.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md',
    },
  },
  {
    title: 'a negative price',
    offer: { price: -0.01 },
    error: 'Price must be greater than 0',
  },
  {
    title: 'a price that is not a number',
    offer: { price: 'abc' },
    error: 'Price must be greater than 0',
  },
  {
    title: 'a description of 301 characters',
    offer: { description: 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'.repeat(17).slice(0, 301) },
    error: 'Description cannot exceed 300 characters',
  },
  {
    title: 'an HTML tag in the description',
    offer: { description: 'QA offer <b>bold</b>' },
    error: 'Description contains invalid characters',
  },
];
