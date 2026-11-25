import { test, expect } from '#src/fixtures/index.ts';
import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';

// A decimal price catches rounding or integer truncation. Both users start with money, so each
// balance after the buy tells "changed by the price" apart from "set to the price" or "set to 0".
const PRICE = 123.45;
const BUYER_FUNDS = 200;
const BUYER_REMAINDER = 76.55;
const SELLER_FUNDS = 10;
const SELLER_TOTAL = 133.45;

test(
  'a sale moves the price to the seller and the field to the buyer, marks the offer sold, and both histories record it',
  { tag: '@critical' },
  async ({ createUser, createField, fundUser, createOffer, readSale, apiAs }) => {
    // Income takes ~2 s and a buy ~4 s, and the app runs them one at a time across all workers.
    test.slow();

    const sale = await test.step('seller lists a field, both users are funded', async () => {
      const [seller, buyer] = await Promise.all([createUser(), createUser()]);
      const [field] = await Promise.all([
        createField(seller),
        fundUser(seller, SELLER_FUNDS),
        fundUser(buyer, BUYER_FUNDS),
      ]);
      const offer = await createOffer(
        seller,
        buildOffer({ itemType: 'field', itemId: field.id }, { price: PRICE }),
      );
      return { seller, buyer, field, offer };
    });

    const { seller, buyer, field, offer } = sale;

    await test.step('before the buy the seller owns the field and neither user has a sale', async () => {
      expect(await readSale(sale)).toEqual({
        offerStatus: 'active',
        seller: { balance: SELLER_FUNDS, field, marketplaceHistory: [], marketplaceFinance: [] },
        buyer: {
          balance: BUYER_FUNDS,
          field: undefined,
          offerInBrowse: true,
          marketplaceHistory: [],
          marketplaceFinance: [],
        },
      });
    });

    const transaction = await test.step('buyer buys the offer', async () => {
      const bought = await apiAs(MarketplaceApi, buyer).buy(offer.id);

      // The error first, so a refused buy reports the app's message, not only the status.
      expect(bought.error).toBeUndefined();
      expect(bought.status).toBe(200);
      expect(bought.data.transaction).toMatchObject({
        offerId: offer.id,
        sellerId: seller.id,
        buyerId: buyer.id,
        itemType: 'field',
        itemId: field.id,
        price: PRICE,
        status: 'completed',
      });
      return bought.data.transaction;
    });

    await test.step('after the buy the money, the field, the offer and both histories reflect the sale', async () => {
      expect(await readSale(sale)).toEqual({
        offerStatus: 'sold',
        seller: {
          balance: SELLER_TOTAL,
          field: undefined,
          marketplaceHistory: [transaction],
          marketplaceFinance: [
            { type: 'income', amount: PRICE, category: 'marketplace', description: 'Marketplace sale' },
          ],
        },
        buyer: {
          balance: BUYER_REMAINDER,
          field: { ...field, userId: buyer.id },
          offerInBrowse: false,
          marketplaceHistory: [transaction],
          marketplaceFinance: [
            { type: 'expense', amount: PRICE, category: 'marketplace', description: 'Marketplace purchase' },
          ],
        },
      });
    });
  },
);
