import type { z } from 'zod';
import type { accountResultSchema, FinancialStats, MarketplaceStats } from '#src/api/models/financial.ts';
import type { ListedOffer } from '#src/api/models/marketplace.ts';
import type { Statistics } from '#src/api/models/statistics.ts';

type FieldOffer = Extract<ListedOffer, { itemType: 'field' }>;
type AnimalOffer = Extract<ListedOffer, { itemType: 'animal' }>;

// The item ids sit far from the offer ids, so no mocked field or animal of the viewer shares one:
// the card heading looks the item up among the viewer's own items by itemId.
const ITEM_ID_OFFSET = 70_000;

const CREATED = '2026-11-20T10:00:00.000Z';
/** The viewer's balance in every Marketplace mock: non-round, so a wrong source shows. */
export const MOCK_BALANCE = 13.57;

const listed = (id: number) => ({
  id,
  sellerId: 9_001,
  itemId: ITEM_ID_OFFSET + id,
  price: 10,
  description: `Mock offer ${id}`,
  status: 'active' as const,
  createdAt: CREATED,
  updatedAt: CREATED,
  sellerLabel: 'mock_seller',
});

/** An active field offer of another user, as Browse lists it; deterministic for a given id. */
export function buildFieldOffer(
  id: number,
  overrides: Partial<Omit<FieldOffer, 'id' | 'itemType'>> = {},
): FieldOffer {
  return {
    ...listed(id),
    itemType: 'field',
    details: { name: `Mock field ${id}`, area: 1.5 },
    ...overrides,
  };
}

/** An active animal-group offer of another user, as Browse lists it; deterministic for a given id. */
export function buildAnimalOffer(
  id: number,
  overrides: Partial<Omit<AnimalOffer, 'id' | 'itemType'>> = {},
): AnimalOffer {
  return {
    ...listed(id),
    itemType: 'animal',
    details: { type: 'sheep', amount: 4 },
    ...overrides,
  };
}

// The rest of the Marketplace page's load: a viewer funded once with a non-round balance and no
// trades, and an app with nothing on the market. The header shows these totals, not the length of the offers list.

/** GET /api/v1/financial/account of the viewer. */
export function buildAccount(userId: number): z.infer<typeof accountResultSchema> {
  return {
    account: {
      id: userId,
      userId,
      balance: MOCK_BALANCE,
      currency: 'ROL',
      createdAt: CREATED,
      updatedAt: CREATED,
    },
  };
}

export const viewerFinancialStats: FinancialStats = {
  statistics: {
    currentBalance: MOCK_BALANCE,
    totalIncome: MOCK_BALANCE,
    totalExpenses: 0,
    totalTransferred: 0,
    transactionCount: 1,
    categories: {},
    monthlyStats: {},
  },
};

export const emptyMarketplaceStats: MarketplaceStats = {
  totalActiveOffers: 0,
  totalOffers: 0,
  totalTransactions: 0,
  totalVolume: 0,
  offersByType: { field: 0, animal: 0 },
  activeOffersByType: { field: 0, animal: 0 },
};

export const emptyStatistics: Statistics = {
  users: 0,
  farms: 0,
  area: 0,
  staff: 0,
  animals: 0,
  avgStaffAge: 0,
  offers: 0,
  totalValue: 0,
};
