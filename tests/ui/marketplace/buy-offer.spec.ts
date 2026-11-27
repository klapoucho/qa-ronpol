import { test, expect } from '#src/fixtures/index.ts';
import { uniqueId } from '#src/data/unique.ts';

// Non-round amounts whose sums are float traps in JavaScript (40.17 - 23.45 is 16.720000000000002),
// so a balance the app forgot to round shows. Both users start with money, so a balance that
// changed by the price differs from one that was set to the price.
const PRICE = 23.45;
const OTHER_PRICE = 23.54;

// Tagged @ledger: the test runs alone in the ui-ledger project, because the page gives up on a buy
// that waits more than 15 s behind other tests' money operations (docs/app-under-test.md).
test(
  'a buyer buys an offer in Browse',
  { tag: ['@critical', '@ledger'] },
  async ({ createUser, loginAs, marketplacePage }) => {
    test.slow(); // the app moves money one operation at a time, 2 to 4 s each

    // Given a seller with two offers, and a buyer who can afford them
    const [seller, buyer] = await Promise.all([createUser({ funds: 17.43 }), createUser({ funds: 40.17 })]);
    const description = `QA offer ${uniqueId()}`; // the text the buyer filters Browse by
    const otherOffer = await seller.offerField(await seller.createField(), {
      price: OTHER_PRICE,
      description,
    });
    const field = await seller.createField();
    const offer = await seller.offerField(field, { price: PRICE, description });

    // When the buyer finds the seller's offers in Browse
    await loginAs(buyer);
    await marketplacePage.goto();
    await marketplacePage.filterOffers(description);
    const card = marketplacePage.browseCard(offer.id);
    const otherCard = marketplacePage.browseCard(otherOffer.id);

    await expect(marketplacePage.balance).toHaveText('40.17 ROL');
    await expect(card).toShowFields({ price: `${PRICE} ROL` });
    await expect(otherCard).toShowFields({ price: `${OTHER_PRICE} ROL` });

    // and buys one of them, confirming in the dialog
    await marketplacePage.startPurchase(offer.id);
    await expect(marketplacePage.confirmation.title).toHaveText('Confirm Purchase');
    await expect(marketplacePage.confirmation.message).toContainText(`for ${PRICE} ROL?`);
    const purchase = await marketplacePage.confirmPurchase();

    // Then the page confirms the purchase and shows the new balance
    expect(purchase.response.status()).toBe(200);
    await expect(marketplacePage.notification('Purchase completed successfully!')).toBeVisible();
    await expect(marketplacePage.balance).toHaveText('16.72 ROL');

    // the bought offer is gone from Browse, the other one stays
    await purchase.browseReloaded;
    await expect(card.root).toHaveCount(0);
    await expect(otherCard).toShowFields({ price: `${OTHER_PRICE} ROL` });

    // Transaction History shows the purchase
    await marketplacePage.openTransactionHistory();
    await expect(marketplacePage.transactions).toHaveCount(1);
    await expect(marketplacePage.transaction(0)).toShowFields({
      type: /^\s*Purchase: /,
      amount: `-${PRICE} ROL`,
    });

    // and the app agrees: the money and the field moved, only the bought offer is sold
    expect(await buyer.balance()).toBe(16.72);
    expect(await seller.balance()).toBe(40.88);
    expect(await buyer.fields()).toEqual([{ ...field, userId: buyer.id }]);
    expect(await seller.myOffers()).toMatchObject([
      { id: otherOffer.id, status: 'active' },
      { id: offer.id, status: 'sold' },
    ]);
  },
);
