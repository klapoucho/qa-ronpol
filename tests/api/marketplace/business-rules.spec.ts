import { test, expect } from '#src/fixtures/index.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';
import { expectFailureBecauseOf } from '#src/fixtures/known-bug.ts';
import { invalidOffers, validOffers } from './business-rules.params.ts';

// What the Marketplace accepts and what it refuses. A refusal must also change nothing, so the
// tests read what the users have before the call and compare it afterwards.
//
// Tests are grouped by endpoint, then by the status it answers with (docs/writing-tests.md).

test.describe('POST /api/v1/marketplace/offers', () => {
  // The app answers 200 where its contract documents 201
  // (.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md).
  test.describe('200', () => {
    for (const { title, offer } of validOffers) {
      test(`an offer with ${title} is created and other users can browse it`, async ({ createUser }) => {
        // Given a seller with a field, and a visitor
        const [seller, visitor] = await Promise.all([createUser(), createUser()]);
        const field = await seller.createField();
        const input = buildOffer({ itemType: 'field', itemId: field.id }, offer);

        // When the seller offers the field
        const response = await seller.api.marketplace.createOffer(input);

        // Then the app stores the offer as sent
        expect(response).toMatchObject({ status: 200, error: undefined });
        const created = response.data.offer;
        expect(created).toMatchObject({
          ...input,
          description: input.description ?? '', // no description is stored as an empty one
          sellerId: seller.id,
          status: 'active',
        });
        // the seller sees it in their offers, and other users can browse it
        expect(await seller.myOffers()).toEqual([created]);
        const browsable = await visitor.browseOffers();
        expect(browsable.filter(({ sellerId }) => sellerId === seller.id)).toEqual([created]);
      });
    }
  });

  test.describe('400', () => {
    for (const { title, offer, error, bug } of invalidOffers) {
      test(`an offer with ${title} is refused`, async ({ createUser }) => {
        // Given a seller with a field, and an offer that is valid except for one input
        const seller = await createUser();
        const field = await seller.createField();
        const input = { ...buildOffer({ itemType: 'field', itemId: field.id }), ...offer };
        expectFailureBecauseOf(bug);

        // When the seller sends it
        const response = await seller.api.marketplace.createOfferUnchecked(input);

        // Then the app names the problem and creates no offer
        expect(response).toMatchObject({ status: 400, error });
        expect(await seller.myOffers()).toEqual([]);
      });
    }

    test('a second offer for an item that is already on offer is refused', async ({ createUser }) => {
      // Given a seller whose animals are already on offer
      const seller = await createUser();
      const animal = await seller.createAnimal();
      const first = await seller.offerAnimal(animal, { price: 11.11 });
      const second = buildOffer({ itemType: 'animal', itemId: animal.id }, { price: 22.22 });

      // When the seller offers the same animals again
      const response = await seller.api.marketplace.createOffer(second);

      // Then the app refuses, and the first offer stays the only one
      expect(response).toMatchObject({ status: 400, error: 'Item is already offered for sale' });
      expect(await seller.myOffers()).toEqual([first]);
    });
  });

  test.describe('404', () => {
    test("an offer for another user's item is refused", async ({ createUser }) => {
      // Given a seller, and animals that belong to another user
      const [seller, owner] = await Promise.all([createUser(), createUser()]);
      const animal = await owner.createAnimal();
      // The seller owns animals too, so only the ownership of this group can refuse the offer.
      await seller.createAnimal();

      // When the seller offers the other user's animals
      const response = await seller.api.marketplace.createOffer(
        buildOffer({ itemType: 'animal', itemId: animal.id }),
      );

      // Then the app refuses: no offer, and the owner keeps the animals
      expect(response).toMatchObject({ status: 404, error: 'Item not found or not owned by user' });
      expect(await seller.myOffers()).toEqual([]);
      expect(await owner.animals()).toEqual([animal]);
    });
  });
});

test.describe('POST /api/v1/marketplace/buy', () => {
  test.describe('400', () => {
    test('a seller cannot buy their own offer', async ({ createUser }) => {
      test.slow(); // the app moves money one operation at a time, 2 to 4 s each

      // Given a seller with an offer. They can afford it, so only the own-offer rule can refuse the buy.
      const seller = await createUser({ funds: 88.88 });
      const offer = await seller.offerField(await seller.createField(), { price: 20.5 });
      const before = await seller.everything();

      // When the seller buys their own offer
      const response = await seller.api.marketplace.buy(offer.id);

      // Then the app refuses, and the seller has what they had before
      expect(response).toMatchObject({ status: 400, error: 'Cannot buy your own offer' });
      expect(await seller.everything()).toEqual(before);
    });

    test('a buyer one cent short of the price cannot buy', async ({ createUser }) => {
      test.slow(); // as above: the buy waits in the app's money queue

      // Given an offer for 50.25 ROL and a buyer with 50.24: the smallest amount that is not enough
      const [seller, buyer] = await Promise.all([createUser({ funds: 17.43 }), createUser({ funds: 50.24 })]);
      const offer = await seller.offerField(await seller.createField(), { price: 50.25 });
      const before = await Promise.all([seller.everything(), buyer.everything()]);

      // When the buyer buys the offer
      const response = await buyer.api.marketplace.buy(offer.id);

      // Then the app refuses, and both users have what they had before
      expect(response).toMatchObject({
        status: 400,
        error: 'Insufficient funds to complete purchase (no overdraft allowed)',
      });
      expect(await Promise.all([seller.everything(), buyer.everything()])).toEqual(before);
    });
  });

  test.describe('404', () => {
    test('a cancelled offer cannot be bought', async ({ createUser }) => {
      test.slow(); // as above: the buy waits in the app's money queue

      // Given an offer its seller cancelled, and a buyer with money to spend
      const [seller, buyer] = await Promise.all([createUser(), createUser({ funds: 66.66 })]);
      const offer = await seller.offerAnimal(await seller.createAnimal());
      await seller.cancelOffer(offer);
      const before = await Promise.all([seller.everything(), buyer.everything()]);

      // When the buyer buys the cancelled offer
      const response = await buyer.api.marketplace.buy(offer.id);

      // Then the app does not find it, and both users have what they had before
      expect(response).toMatchObject({ status: 404, error: 'Offer not found or not available' });
      expect(await Promise.all([seller.everything(), buyer.everything()])).toEqual(before);
    });
  });
});

test.describe('DELETE /api/v1/marketplace/offers/{offerId}', () => {
  test.describe('403', () => {
    test("a user cannot cancel another user's offer", async ({ createUser }) => {
      // Given a seller with an offer, and another user
      const [seller, stranger] = await Promise.all([createUser(), createUser()]);
      const offer = await seller.offerField(await seller.createField());

      // When the other user cancels the offer
      const response = await stranger.api.marketplace.cancel(offer.id);

      // Then the app refuses, and the offer stays active
      expect(response).toMatchObject({ status: 403, error: 'Not authorized to cancel this offer' });
      expect(await seller.myOffers()).toEqual([offer]);
    });
  });
});
