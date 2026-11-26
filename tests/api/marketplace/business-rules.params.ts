import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import type { ApiResponse } from '#src/api/http/api-response.ts';
import type { OfferInput, OfferItem } from '#src/api/models/marketplace.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';
import {
  seeded,
  type ApiAs,
  type CreateUser,
  type FundUser,
  type TestUser,
} from '#src/fixtures/api.fixtures.ts';
import type { CreateItem, CreateOffer } from '#src/fixtures/marketplace.fixtures.ts';

// Cases of business-rules.spec.ts (T2: AC-1, AC-2, AC-4, AC-6, AC-7). Each rule runs for one item
// type; the types alternate across the rules, so both a field and an animal group are exercised.

const ITEM_NAMES = { field: 'a field', animal: 'an animal group' } as const;

// ---------- valid offers (AC-1) ----------

// Every character class AC-1 allows: all 18 Polish letters, digits, `_`, spaces and . , ; : ! ( ) -
const ALLOWED_CHARACTERS = 'Pole ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ 0123456789 . , ; : ! ( ) - _ ';
const DESCRIPTION_300 = ALLOWED_CHARACTERS.repeat(6).slice(0, 300);
if (DESCRIPTION_300.length !== 300) {
  throw new Error(`The 300-character description has ${DESCRIPTION_300.length} characters`);
}

type ValidOffer = {
  title: string;
  itemType: OfferItem['itemType'];
  offer: Pick<OfferInput, 'price' | 'description'>;
};

export const validOffers: ValidOffer[] = [
  // The lowest price and no description: the app stores the description as "".
  {
    title: `${ITEM_NAMES.field} at 0.01 with no description`,
    itemType: 'field',
    offer: { price: 0.01, description: undefined },
  },
  {
    title: `${ITEM_NAMES.animal} with a 300-character description of every allowed character`,
    itemType: 'animal',
    offer: { price: 12.34, description: DESCRIPTION_300 },
  },
];

// ---------- refusals ----------

export const OPERATIONS = {
  createOffer: 'POST /api/v1/marketplace/offers',
  buy: 'POST /api/v1/marketplace/buy',
  cancel: 'DELETE /api/v1/marketplace/offers/{offerId}',
} as const;

export type SceneFixtures = {
  createUser: CreateUser;
  createItem: CreateItem;
  createOffer: CreateOffer;
  fundUser: FundUser;
  apiAs: ApiAs;
};

/**
 * A seeded case: the two users and the item whose state readMarket compares, the ids of the
 * seller's offers the other user can browse before the refused call, and that call.
 */
export type Scene = {
  seller: TestUser;
  other: TestUser;
  item: OfferItem;
  browsableBefore: number[];
  act: () => Promise<ApiResponse<unknown>>;
};

export type RefusalCase = {
  title: string;
  operation: (typeof OPERATIONS)[keyof typeof OPERATIONS];
  status: number;
  error: string;
  /** An open app bug that makes this case fail today: the test is marked test.fail(). */
  bug?: { title: string; file: string };
  arrange: (fixtures: SceneFixtures) => Promise<Scene>;
};

// The seller tries to list a fresh item of their own; `other` only watches browse.
async function createRefused(
  { createUser, createItem, apiAs }: SceneFixtures,
  itemType: OfferItem['itemType'],
  offer: { price?: number | string; description?: string },
): Promise<Scene> {
  const [seller, other] = await Promise.all([createUser(), createUser()]);
  const item = await createItem(seller, itemType);
  return {
    seller,
    other,
    item,
    browsableBefore: [],
    // A string price is outside OfferInput on purpose: the wrong-type partition of AC-1.
    act: () => apiAs(MarketplaceApi, seller).createOfferUnchecked({ ...buildOffer(item), ...offer }),
  };
}

// The seller lists an item that the other user can browse; both users start with the given
// (non-zero, non-round) money.
async function listed(
  { createUser, createItem, createOffer, fundUser }: SceneFixtures,
  itemType: OfferItem['itemType'],
  {
    offer = {},
    sellerFunds,
    otherFunds,
  }: { offer?: Partial<OfferInput>; sellerFunds?: number; otherFunds?: number },
) {
  const [seller, other] = await Promise.all([createUser(), createUser()]);
  const [item] = await Promise.all([
    createItem(seller, itemType),
    sellerFunds === undefined ? undefined : fundUser(seller, sellerFunds),
    otherFunds === undefined ? undefined : fundUser(other, otherFunds),
  ]);
  const listing = await createOffer(seller, buildOffer(item, offer));
  return { seller, other, item, listing, browsableBefore: [listing.id] };
}

const MESSAGES = {
  price: 'Price must be greater than 0',
  descriptionLength: 'Description cannot exceed 300 characters',
  descriptionCharacters: 'Description contains invalid characters',
  alreadyOffered: 'Item is already offered for sale',
  notOwned: 'Item not found or not owned by user',
  ownOffer: 'Cannot buy your own offer',
  insufficientFunds: 'Insufficient funds to complete purchase (no overdraft allowed)',
  notAvailable: 'Offer not found or not available',
  notAuthorizedToCancel: 'Not authorized to cancel this offer',
} as const;

export const refusals: RefusalCase[] = [
  // AC-1: invalid input answers 400 with a message naming the problem.
  {
    title: 'field offer at price 0',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.price,
    // Today: 400 "Missing required fields: itemType, itemId, price".
    bug: {
      title:
        'Create offer refuses price 0 as a "missing field" and accepts malformed price and description values',
      file: '.qa/bugs/ghissue-12/post-api-marketplace-offers--invalid-price-and-types.md',
    },
    arrange: (fx) => createRefused(fx, 'field', { price: 0 }),
  },
  {
    title: 'field offer at price -0.01',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.price,
    arrange: (fx) => createRefused(fx, 'field', { price: -0.01 }),
  },
  {
    title: 'field offer with a price that is not a number',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.price,
    arrange: (fx) => createRefused(fx, 'field', { price: 'abc' }),
  },
  {
    title: 'field offer with a description of 301 Polish letters',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.descriptionLength,
    arrange: (fx) =>
      createRefused(fx, 'field', { description: 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ'.repeat(17).slice(0, 301) }),
  },
  {
    title: 'field offer with an HTML tag in the description',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.descriptionCharacters,
    arrange: (fx) => createRefused(fx, 'field', { description: 'QA offer <b>bold</b>' }),
  },
  // AC-2: the second offer differs in everything the seller chooses.
  {
    title: 'second offer for an animal group already offered',
    operation: OPERATIONS.createOffer,
    status: 400,
    error: MESSAGES.alreadyOffered,
    arrange: async (fx) => {
      const scene = await listed(fx, 'animal', {
        offer: { price: 11.11, description: 'QA first offer' },
      });
      const second = buildOffer(scene.item, {
        price: 22.22,
        description: 'QA second offer for the same item',
      });
      return { ...scene, act: () => fx.apiAs(MarketplaceApi, scene.seller).createOffer(second) };
    },
  },
  // AC-1: the seller owns an animal group too, so only the ownership of this one can refuse it.
  {
    title: "offer for another user's animal group",
    operation: OPERATIONS.createOffer,
    status: 404,
    error: MESSAGES.notOwned,
    arrange: async ({ createUser, createItem, apiAs }) => {
      const [seller, owner] = await Promise.all([createUser(), createUser()]);
      const [item] = await Promise.all([createItem(owner, 'animal'), createItem(seller, 'animal')]);
      return {
        seller,
        other: owner,
        item,
        browsableBefore: [],
        act: () => apiAs(MarketplaceApi, seller).createOffer(buildOffer(item)),
      };
    },
  },
  // AC-6: the seller can afford the offer, so only the own-offer rule can refuse it.
  {
    title: 'seller buys their own field offer',
    operation: OPERATIONS.buy,
    status: 400,
    error: MESSAGES.ownOffer,
    arrange: async (fx) => {
      const scene = await listed(fx, 'field', { offer: { price: 20.5 }, sellerFunds: 88.88 });
      return { ...scene, act: () => fx.apiAs(MarketplaceApi, scene.seller).buy(scene.listing.id) };
    },
  },
  // AC-4: no overdraft, one cent short of the price.
  {
    title: 'buyer one cent short of a field offer',
    operation: OPERATIONS.buy,
    status: 400,
    error: MESSAGES.insufficientFunds,
    arrange: async (fx) => {
      const scene = await listed(fx, 'field', {
        offer: { price: 50.25 },
        sellerFunds: 17.43,
        otherFunds: 50.24,
      });
      return { ...scene, act: () => fx.apiAs(MarketplaceApi, scene.other).buy(scene.listing.id) };
    },
  },
  // AC-7: a cancelled offer leaves browse (browsableBefore) and cannot be bought.
  {
    title: 'buyer buys a cancelled animal group offer',
    operation: OPERATIONS.buy,
    status: 404,
    error: MESSAGES.notAvailable,
    arrange: async (fx) => {
      const scene = await listed(fx, 'animal', { otherFunds: 66.66 });
      const { seller, other, listing } = scene;
      seeded(await fx.apiAs(MarketplaceApi, seller).cancel(listing.id), `cancel offer ${listing.id}`);
      return { ...scene, browsableBefore: [], act: () => fx.apiAs(MarketplaceApi, other).buy(listing.id) };
    },
  },
  // AC-7: only the seller can cancel.
  {
    title: "another user cancels the seller's field offer",
    operation: OPERATIONS.cancel,
    status: 403,
    error: MESSAGES.notAuthorizedToCancel,
    arrange: async (fx) => {
      const scene = await listed(fx, 'field', {});
      return { ...scene, act: () => fx.apiAs(MarketplaceApi, scene.other).cancel(scene.listing.id) };
    },
  },
];
