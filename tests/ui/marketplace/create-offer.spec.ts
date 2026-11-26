import { test, expect } from '#src/fixtures/index.ts';

// A decimal price catches rounding between the form and the API. Polish letters and the allowed
// punctuation check that the form sends the description as typed.
const PRICE = 12.34;
const DESCRIPTION = 'Żyzna łąka nad rzeką: 2,3 ha (bez zwierząt) - polecam!';

test('a seller lists a field for sale in the Create Offer form', async ({
  createUser,
  loginAs,
  marketplacePage,
}) => {
  // Given a seller with two fields, and another user
  const [seller, visitor] = await Promise.all([createUser(), createUser()]);
  await seller.createField();
  const field = await seller.createField(); // the second in the form's Item list, not the default one

  // When the seller fills in the form and submits it
  await loginAs(seller);
  await marketplacePage.goto();
  await marketplacePage.createOffer({
    itemType: 'field',
    itemId: field.id,
    price: PRICE,
    description: DESCRIPTION,
  });

  // Then the page confirms the offer
  await expect(marketplacePage.notification('Offer created successfully!')).toBeVisible();

  // the app stored exactly one offer, as typed
  const offers = await seller.myOffers();
  expect(offers).toMatchObject([
    { itemType: 'field', itemId: field.id, price: PRICE, description: DESCRIPTION, status: 'active' },
  ]);
  const offer = offers[0]!;

  // My Offers shows its card
  await marketplacePage.openMyOffers();
  const card = marketplacePage.myOfferCard(offer.id);
  await expect(card.root).toBeVisible();
  await expect(card).toShowFields({
    type: 'Field',
    price: `${PRICE} ROL`,
    name: field.name,
    details: `Field: ${field.name}, Area: ${field.area} ha`,
    description: DESCRIPTION,
  });

  // and other users can browse the offer, while the seller's own Browse leaves it out
  const idsOf = (list: { id: number }[]) => list.map(({ id }) => id);
  expect(idsOf(await visitor.browseOffers())).toContain(offer.id);
  expect(idsOf(await seller.browseOffers())).not.toContain(offer.id);
});
