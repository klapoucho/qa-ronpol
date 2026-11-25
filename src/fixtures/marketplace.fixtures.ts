import { FieldsApi } from '#src/api/clients/fields-api.ts';
import { FinancialApi } from '#src/api/clients/financial-api.ts';
import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import type { Field } from '#src/api/models/field.ts';
import type { FinancialTransaction } from '#src/api/models/financial.ts';
import type { MarketplaceTransaction, Offer, OfferInput } from '#src/api/models/marketplace.ts';
import { test as apiTest, seeded } from '#src/fixtures/api.fixtures.ts';
import type { ApiAs, TestUser } from '#src/fixtures/api.fixtures.ts';

export type CreateOffer = (seller: TestUser, input: OfferInput) => Promise<Offer>;

type PartySaleView = {
  balance: number;
  /** The field on sale, as this user's own field list shows it; undefined when they do not own it. */
  field: Field | undefined;
  marketplaceHistory: MarketplaceTransaction[];
  /** Financial history entries of the marketplace category (they carry no reference to the sale). */
  marketplaceFinance: Pick<FinancialTransaction, 'type' | 'amount' | 'category' | 'description'>[];
};

/** Every surface AC-5 names for one offer of a field, read through both users' own endpoints. */
export type SaleView = {
  /** The offer's status in the seller's My Offers. */
  offerStatus: Offer['status'] | undefined;
  seller: PartySaleView;
  buyer: PartySaleView & { offerInBrowse: boolean };
};
export type ReadSale = (sale: {
  seller: TestUser;
  buyer: TestUser;
  offer: Offer;
  field: Field;
}) => Promise<SaleView>;

type MarketplaceFixtures = {
  createOffer: CreateOffer;
  readSale: ReadSale;
};

async function readParty(apiAs: ApiAs, user: TestUser, fieldId: number): Promise<PartySaleView> {
  const [account, finance, fields, history] = await Promise.all([
    apiAs(FinancialApi, user).account(),
    apiAs(FinancialApi, user).transactions(),
    apiAs(FieldsApi, user).list(),
    apiAs(MarketplaceApi, user).transactions(),
  ]);
  return {
    balance: account.data.account.balance,
    field: fields.data.find((field) => field.id === fieldId),
    marketplaceHistory: history.data.transactions,
    marketplaceFinance: finance.data.transactions
      .filter((entry) => entry.category === 'marketplace')
      .map(({ type, amount, category, description }) => ({ type, amount, category, description })),
  };
}

export const test = apiTest.extend<MarketplaceFixtures>({
  createOffer: async ({ apiAs }, use) => {
    await use(async (seller, input) => {
      const created = await apiAs(MarketplaceApi, seller).createOffer(input);
      return seeded(created, `create offer for user ${seller.id}`).offer;
    });
  },
  readSale: async ({ apiAs }, use) => {
    await use(async ({ seller, buyer, offer, field }) => {
      const [sellerView, buyerView, myOffers, browse] = await Promise.all([
        readParty(apiAs, seller, field.id),
        readParty(apiAs, buyer, field.id),
        apiAs(MarketplaceApi, seller).myOffers(),
        apiAs(MarketplaceApi, buyer).offers(),
      ]);
      return {
        offerStatus: myOffers.data.offers.find(({ id }) => id === offer.id)?.status,
        seller: sellerView,
        buyer: { ...buyerView, offerInBrowse: browse.data.offers.some(({ id }) => id === offer.id) },
      };
    });
  },
});
