import { test, expect } from '#src/fixtures/index.ts';

// A decimal price catches rounding. Both users start with money, so a balance that changed by the
// price differs from one that was set to the price or to zero.
const PRICE = 123.45;

test(
  'a sale moves the price to the seller and the field to the buyer',
  { tag: '@critical' },
  async ({ createUser }) => {
    test.slow(); // the app moves money one operation at a time, 2 to 4 s each

    // Given a seller offering a field, and a buyer who can afford it
    const [seller, buyer] = await Promise.all([createUser({ funds: 10 }), createUser({ funds: 200 })]);
    const field = await seller.createField();
    const offer = await seller.offerField(field, { price: PRICE });

    // When the buyer buys the offer
    const purchase = await buyer.api.marketplace.buy(offer.id);

    // Then the app confirms the sale
    expect(purchase.error).toBeUndefined();
    expect(purchase.status).toBe(200);
    const sale = purchase.data.transaction;
    expect(sale).toMatchObject({
      offerId: offer.id,
      sellerId: seller.id,
      buyerId: buyer.id,
      itemType: 'field',
      itemId: field.id,
      price: PRICE,
      status: 'completed',
    });

    // the price moved from the buyer to the seller
    expect(await seller.balance()).toBe(133.45);
    expect(await buyer.balance()).toBe(76.55);

    // the field belongs to the buyer
    expect(await seller.fields()).toEqual([]);
    expect(await buyer.fields()).toEqual([{ ...field, userId: buyer.id }]);

    // the offer is sold
    expect(await seller.myOffers()).toMatchObject([{ id: offer.id, status: 'sold' }]);

    // both users see the sale in their marketplace history
    expect(await seller.marketplaceHistory()).toEqual([sale]);
    expect(await buyer.marketplaceHistory()).toEqual([sale]);

    // and in their financial history, newest first, above the money they started with
    expect(await seller.financialHistory()).toMatchObject([
      { type: 'income', amount: PRICE, category: 'marketplace', description: 'Marketplace sale' },
      { type: 'income', amount: 10 },
    ]);
    expect(await buyer.financialHistory()).toMatchObject([
      { type: 'expense', amount: PRICE, category: 'marketplace', description: 'Marketplace purchase' },
      { type: 'income', amount: 200 },
    ]);
  },
);
