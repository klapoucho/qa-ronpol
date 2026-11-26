import { test, expect } from '#src/fixtures/index.ts';
import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import type { Offer } from '#src/api/models/marketplace.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';

// A decimal price catches rounding or integer truncation between the form and the API. Polish
// letters and the allowed punctuation check that the form sends the description as typed.
const PRICE = 12.34;
const DESCRIPTION = 'Żyzna łąka nad rzeką: 2,3 ha (bez zwierząt) - polecam!';

test('seller lists a field in the form; it shows in My Offers and other users can browse it', async ({
  createUser,
  createField,
  loginAs,
  marketplacePage,
  apiAs,
}) => {
  const { seller, other, first, listed } =
    await test.step('seller with two fields, another user', async () => {
      const [seller, other] = await Promise.all([createUser(), createUser()]);
      // In this order, so the field to list is the second in the Item list, not the first.
      const first = await createField(seller);
      const listed = await createField(seller);
      return { seller, other, first, listed };
    });

  await test.step('seller lists the second field in Create Offer', async () => {
    await loginAs(seller);
    await marketplacePage.goto();
    await marketplacePage.createOffer(
      buildOffer({ itemType: 'field', itemId: listed.id }, { price: PRICE, description: DESCRIPTION }),
    );

    await expect(
      marketplacePage.notifications.filter({ hasText: 'Offer created successfully!' }),
    ).toBeVisible();
  });

  const offer =
    await test.step('the Browse API lists the offer for another user, not for the seller', async () => {
      const [otherBrowse, sellerBrowse] = await Promise.all([
        apiAs(MarketplaceApi, other).offers(),
        apiAs(MarketplaceApi, seller).offers(),
      ]);
      // By item, not by seller id: a reused id of a deleted account brings that account's offers along.
      const ofSellerFields = (offers: Offer[]) =>
        offers.filter(
          ({ itemType, itemId }) => itemType === 'field' && [first.id, listed.id].includes(itemId),
        );

      const listedOffers = ofSellerFields(otherBrowse.data.offers);

      // Exactly one offer: the second field, as typed. The first field stays unlisted.
      expect(listedOffers).toEqual([
        expect.objectContaining({
          sellerId: seller.id,
          itemType: 'field',
          itemId: listed.id,
          price: PRICE,
          description: DESCRIPTION,
          status: 'active',
        }),
      ]);
      expect(ofSellerFields(sellerBrowse.data.offers)).toEqual([]);
      // The first assertion proves there is exactly one.
      return listedOffers[0]!;
    });

  await test.step('the offer shows in My Offers', async () => {
    await marketplacePage.openMyOffers();
    const card = marketplacePage.myOfferCard(offer.id);

    // My Offers is rendered while its tab is hidden, and a hidden card still has text.
    await expect(card.root).toBeVisible();
    await expect(card).toShowFields({
      type: 'Field',
      price: `${PRICE} ROL`,
      name: listed.name,
      details: `Field: ${listed.name}, Area: ${listed.area} ha`,
      description: DESCRIPTION,
    });
  });
});
