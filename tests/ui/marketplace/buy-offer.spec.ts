import { test, expect } from '#src/fixtures/index.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';
import { uniqueId } from '#src/data/unique.ts';
import { TransactionItem } from '#src/ui/components/transaction-item.ts';

// Non-round amounts whose differences are float traps (40.17 - 23.45 is 16.720000000000002 in JS,
// 17.43 + 23.45 is 40.879999999999995), and both users start with money: each balance after the
// buy tells "changed by the price" apart from "set to" it, and catches a missing rounding.
const PRICE = 23.45;
const BUYER_FUNDS = 40.17;
const BUYER_REMAINDER = 16.72;
const SELLER_FUNDS = 17.43;
const SELLER_TOTAL = 40.88;
// A second offer of the same seller at a near price: the buy must take the right card.
const DECOY_PRICE = 23.54;

test(
  'buyer buys an offer in Browse: the balance drops by the price, the offer leaves Browse and the purchase is in the history',
  { tag: ['@critical', '@ledger'] },
  async ({ createUser, createField, fundUser, createOffer, readSale, loginAs, marketplacePage }) => {
    // Two incomes (~2 s each) and a buy (~4 s) behind the app's money lock, plus a page that
    // downloads every active offer twice: more than the default 30 s on a slow connection.
    test.slow();

    const { tag, sale, decoy } =
      await test.step('a funded seller lists two fields under one tag, a funded buyer', async () => {
        const tag = uniqueId();
        const [seller, buyer] = await Promise.all([createUser(), createUser()]);
        const description = `QA offer ${tag}`;
        // One field at a time: two concurrent creates of one user both answer with the newest id.
        // The decoy first, so the offer to buy is not the first card.
        const listFields = async () => {
          const decoyField = await createField(seller);
          const decoy = await createOffer(
            seller,
            buildOffer({ itemType: 'field', itemId: decoyField.id }, { price: DECOY_PRICE, description }),
          );
          const field = await createField(seller);
          const offer = await createOffer(
            seller,
            buildOffer({ itemType: 'field', itemId: field.id }, { price: PRICE, description }),
          );
          return { decoy, field, offer };
        };
        // The test runs alone in ui-ledger (@ledger): the app queues every money call behind one lock
        // and the page gives up on the buy after 15 s
        // (.qa/bugs/ghissue-14/post-api-marketplace-buy--ui-gives-up-after-15s-but-charges.md).
        const [{ decoy, field, offer }] = await Promise.all([
          listFields(),
          fundUser(seller, SELLER_FUNDS),
          fundUser(buyer, BUYER_FUNDS),
        ]);
        return { tag, sale: { seller, buyer, field, offer }, decoy };
      });

    const { seller, buyer, field, offer } = sale;

    await test.step('before the buy the seller owns the field and neither user has a sale', async () => {
      // Also proves both users are fresh: a reused id of a deleted account brings its money and history.
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

    const target = marketplacePage.browseCard(offer.id);
    const other = marketplacePage.browseCard(decoy.id);

    await test.step('buyer finds both offers in Browse', async () => {
      await loginAs(buyer);
      await marketplacePage.goto();
      await marketplacePage.filterOffers(tag);

      await expect(marketplacePage.balance).toHaveText(`${BUYER_FUNDS} ROL`);
      await expect(target).toShowFields({ price: `${PRICE} ROL` });
      await expect(other).toShowFields({ price: `${DECOY_PRICE} ROL` });
    });

    const purchase = await test.step('buyer confirms the purchase in the modal', async () => {
      await marketplacePage.startPurchase(offer.id);

      const { root, title, message, confirm } = marketplacePage.confirmation;
      await expect(root).toBeVisible();
      await expect(title).toHaveText('Confirm Purchase');
      await expect(confirm).toHaveText('Buy Now');
      // Only the price: the item is named by its id, not its name
      // (.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md).
      await expect(message).toContainText(`" for ${PRICE} ROL?`);

      const purchase = await marketplacePage.confirmPurchase();
      expect(purchase.response.status()).toBe(200);
      return purchase;
    });

    await test.step('the page confirms the buy and shows the new balance', async () => {
      await expect(
        marketplacePage.notifications.filter({ hasText: 'Purchase completed successfully!' }),
      ).toBeVisible();
      await expect(marketplacePage.balance).toHaveText(`${BUYER_REMAINDER} ROL`);
    });

    await test.step('the offer is gone from Browse, the decoy stays', async () => {
      await purchase.browseReloaded;

      await expect(target.root).toHaveCount(0);
      await expect(other).toShowFields({ price: `${DECOY_PRICE} ROL` });
    });

    await test.step('Transaction History shows the purchase', async () => {
      await marketplacePage.openTransactionHistory();

      await expect(marketplacePage.transactions).toHaveCount(1);
      // Only the kind of entry: until a reload it names the item by its id
      // (.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md).
      await expect(new TransactionItem(marketplacePage.transactions)).toShowFields({
        type: /^\s*Purchase: /,
        amount: `-${PRICE} ROL`,
      });
    });

    await test.step('the money, the field, the offer and both histories reflect the sale', async () => {
      const after = await readSale(sale);
      const transaction = expect.objectContaining({
        offerId: offer.id,
        sellerId: seller.id,
        buyerId: buyer.id,
        itemType: 'field',
        itemId: field.id,
        price: PRICE,
        status: 'completed',
      });

      expect(after).toEqual({
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
      // One sale, recorded once for both users.
      expect(after.seller.marketplaceHistory).toEqual(after.buyer.marketplaceHistory);
    });
  },
);
