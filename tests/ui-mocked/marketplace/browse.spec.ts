import { test, expect } from '#src/fixtures/index.ts';
import { expectFailureBecauseOf } from '#src/fixtures/known-bug.ts';
import { mockMarketplace, offerListReply } from '#src/mocks/handlers/marketplace.ts';
import { buildAnimalOffer, buildFieldOffer, MOCK_BALANCE } from '#src/mocks/payloads/marketplace.ts';
import { fail } from '#src/mocks/replies.ts';

// Browse shows what GET /api/v1/marketplace/offers returns. The API is mocked, so each test decides
// the answer: Browse reads every offer in one answer and builds its pages of 9 in the browser.

const PAGE_SIZE = 9;
const fieldOffers = (count: number) => Array.from({ length: count }, (_, i) => buildFieldOffer(501 + i));

test.describe('Marketplace Browse', () => {
  test('shows each offer as a card with its own data', async ({ mockApi, mockSession, marketplacePage }) => {
    // Given the API returns a field offer and an animal offer
    const meadow = buildFieldOffer(801, {
      price: 12.34,
      details: { name: 'Mock Meadow', area: 2.75 },
      sellerLabel: 'Mock Seller A',
      description: 'Meadow by the river',
    });
    const cows = buildAnimalOffer(802, {
      price: 7,
      details: { type: 'cow', amount: 5 },
      sellerLabel: 'Mock Seller B',
      description: 'Dairy cows',
    });
    mockMarketplace(mockApi, mockSession, offerListReply([meadow, cows]));

    // When the user opens the Marketplace
    await marketplacePage.open();

    // Then Browse shows one card per offer, each with that offer's data
    await expect(marketplacePage.browseCards).toHaveCount(2);
    await expect(marketplacePage.browseCard(meadow.id)).toShowFields({
      type: 'Field',
      price: '12.34 ROL',
      seller: 'Offered by: Mock Seller A',
      details: 'Field: Mock Meadow, Area: 2.75 ha',
      description: 'Meadow by the river',
    });
    await expect(marketplacePage.browseCard(cows.id)).toShowFields({
      type: 'Animal',
      price: '7 ROL',
      seller: 'Offered by: Mock Seller B',
      details: 'Type: cow, Amount: 5',
      description: 'Dairy cows',
    });
  });

  test('keeps a full page of offers on one page', async ({ mockApi, mockSession, marketplacePage }) => {
    // Given the API returns exactly as many offers as one page holds
    mockMarketplace(mockApi, mockSession, offerListReply(fieldOffers(PAGE_SIZE)));

    // When the user opens the Marketplace
    await marketplacePage.open();

    // Then Browse shows them all, and there is no second page
    await expect(marketplacePage.browseCards).toHaveCount(PAGE_SIZE);
    await expect(marketplacePage.browsePageButtons).toHaveText(['« Prev', '1', 'Next »']);
    await expect(marketplacePage.browsePrev).toBeDisabled();
    await expect(marketplacePage.browseNext).toBeDisabled();
  });

  test('moves the offer that does not fit to a second page', async ({
    mockApi,
    mockSession,
    marketplacePage,
  }) => {
    // Given the API returns one offer more than a page holds
    const offers = fieldOffers(PAGE_SIZE + 1);
    const lastOffer = offers.at(-1)!;
    mockMarketplace(mockApi, mockSession, offerListReply(offers));

    // When the user opens the Marketplace
    await marketplacePage.open();

    // Then page 1 shows nine offers, without the last one
    await expect(marketplacePage.browseCards).toHaveCount(PAGE_SIZE);
    await expect(marketplacePage.browseCard(lastOffer.id).root).toHaveCount(0);
    await expect(marketplacePage.browsePageButtons).toHaveText(['« Prev', '1', '2', 'Next »']);
    await expect(marketplacePage.browseCurrentPage).toHaveText('1');
    await expect(marketplacePage.browsePrev).toBeDisabled();

    // When the user goes to the next page
    await marketplacePage.browseNext.click();

    // Then page 2 shows only the last one
    await expect(marketplacePage.browseCards).toHaveCount(1);
    await expect(marketplacePage.browseCard(lastOffer.id).root).toBeVisible();
    await expect(marketplacePage.browseCurrentPage).toHaveText('2');
    await expect(marketplacePage.browseNext).toBeDisabled();
  });

  test('says so when there are no offers', async ({ mockApi, mockSession, marketplacePage }) => {
    // Given the API returns no offers
    mockMarketplace(mockApi, mockSession, offerListReply([]));

    // When the user opens the Marketplace
    await marketplacePage.open();

    // Then Browse says so in place of the cards
    await expect(marketplacePage.browseMessage).toHaveText('No offers available');
    await expect(marketplacePage.browseCards).toHaveCount(0);
  });

  test('shows an error in place of the list when the API fails', async ({
    mockApi,
    mockSession,
    marketplacePage,
  }) => {
    // Given the API fails to return the offers
    mockMarketplace(mockApi, mockSession, fail('Failed to get marketplace offers', 500));

    // When the user opens the Marketplace
    await marketplacePage.open();

    // Then the API's message appears as a toast, and the rest of the page still loads
    await expect(marketplacePage.notification('Failed to get marketplace offers').first()).toBeVisible();
    await expect(marketplacePage.balance).toHaveText(`${MOCK_BALANCE} ROL`);

    // and Browse shows an error in place of the list
    expectFailureBecauseOf({
      title: 'When loading the offers fails, Browse shows "Loading offers..." forever',
      file: '.qa/bugs/ghissue-15/ui-marketplace-browse--failed-load-spins-forever.md',
    });
    await expect(marketplacePage.browseMessage).toHaveText('Failed to load offers');
  });
});
