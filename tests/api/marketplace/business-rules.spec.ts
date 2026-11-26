import { test, expect } from '#src/fixtures/index.ts';
import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';
import { OPERATIONS, refusals, validOffers, type RefusalCase } from './business-rules.params.ts';

// T2: one positive and one negative test, each driven by its case table (FR-09). Tests are grouped
// by operation, then by status (testing-rules/api.md), so each case registers under its own group.

test.describe(OPERATIONS.createOffer, () => {
  // The app answers 200 where the contract documents 201
  // (.qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md). The test
  // asserts the status the app serves, so it fails and gets updated when the bug is fixed.
  test.describe('200', () => {
    for (const { title, itemType, offer } of validOffers) {
      test(`a valid offer for ${title} is stored and shown to other users`, async ({
        createUser,
        createItem,
        apiAs,
      }) => {
        const [seller, observer] = await Promise.all([createUser(), createUser()]);
        const item = await createItem(seller, itemType);
        const input = buildOffer(item, offer);

        const created = await apiAs(MarketplaceApi, seller).createOffer(input);

        expect({ status: created.status, error: created.error }).toEqual({ status: 200, error: undefined });
        expect(created.data.offer).toMatchObject({
          ...item,
          price: input.price,
          description: input.description ?? '',
          sellerId: seller.id,
          status: 'active',
        });
        const [myOffers, browse] = await Promise.all([
          apiAs(MarketplaceApi, seller).myOffers(),
          apiAs(MarketplaceApi, observer).offers(),
        ]);
        expect({
          myOffers: myOffers.data.offers,
          browse: browse.data.offers.filter(({ sellerId }) => sellerId === seller.id),
        }).toEqual({ myOffers: [created.data.offer], browse: [created.data.offer] });
      });
    }
  });

  registerRefusals(OPERATIONS.createOffer);
});

test.describe(OPERATIONS.buy, () => {
  registerRefusals(OPERATIONS.buy);
});

test.describe(OPERATIONS.cancel, () => {
  registerRefusals(OPERATIONS.cancel);
});

// One test body for every refusal: the status, the exact message, and that both users' money,
// histories, offers and items are exactly as before (readMarket).
function registerRefusals(operation: RefusalCase['operation']) {
  const cases = refusals.filter((refusal) => refusal.operation === operation);
  for (const status of [...new Set(cases.map((refusal) => refusal.status))].sort((a, b) => a - b)) {
    test.describe(`${status}`, () => {
      for (const refusal of cases.filter((candidate) => candidate.status === status)) {
        const { title, error, bug, arrange } = refusal;
        // Only the buy cases fund a user and buy, and the app runs incomes and buys one at a time
        // across all workers.
        const slow = operation === OPERATIONS.buy;

        test(
          `${title}: refused and nothing changes`,
          { annotation: bug ? [{ type: 'bug', description: `${bug.title} (${bug.file})` }] : [] },
          async ({ createUser, createItem, createOffer, fundUser, apiAs, readMarket }) => {
            test.slow(slow, 'funds a user and buys');
            const scene = await arrange({ createUser, createItem, createOffer, fundUser, apiAs });
            const before = await readMarket(scene);
            expect(before.other.browseFromSeller.map(({ id }) => id)).toEqual(scene.browsableBefore);
            // Marked after the seed, so a broken setup is never an expected failure.
            test.fail(bug !== undefined, bug?.title);

            const response = await scene.act();

            expect({ status: response.status, error: response.error }).toEqual({ status, error });
            expect(await readMarket(scene)).toEqual(before);
          },
        );
      }
    });
  }
}
