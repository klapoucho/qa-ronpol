import { test, expect } from '#src/fixtures/index.ts';
import { mockMarketplace, offerListReply } from '#src/mocks/handlers/marketplace.ts';
import { fail } from '#src/mocks/replies.ts';
import { listings, noOffers, serverError, type ExpectedPage } from './browse.params.ts';

// T5: Browse renders what GET /api/v1/marketplace/offers returns (AC-8), on a mocked API: cards,
// pagination, the empty state and the error. AC-3 (only other users' offers) is decided by the
// server, so a mock cannot show it.

test.describe('Marketplace Browse renders the offers API', () => {
  for (const { title, offers, cards, pages } of listings) {
    test(`${title}: the cards and the pagination`, async ({ mockApi, mockSession, marketplacePage }) => {
      mockMarketplace(mockApi, mockSession, offerListReply(offers));

      const expectPage = async ({ offerIds, buttons, current }: ExpectedPage, index: number) => {
        await expect(marketplacePage.browseCards).toHaveCount(offerIds.length);
        for (const offerId of offerIds) {
          await expect(marketplacePage.browseCard(offerId).root).toBeVisible();
        }
        await expect(marketplacePage.browsePageButtons).toHaveText(buttons);
        await expect(marketplacePage.browseCurrentPage).toHaveText(current);
        await expect(marketplacePage.browsePrev).toBeEnabled({ enabled: index > 0 });
        await expect(marketplacePage.browseNext).toBeEnabled({
          enabled: index < pages.length - 1,
        });
      };

      await marketplacePage.open();

      const [first, ...rest] = pages;
      await expectPage(first, 0);
      for (const { offerId, shows } of cards) {
        await expect(marketplacePage.browseCard(offerId)).toShowFields(shows);
      }
      for (const [index, page] of rest.entries()) {
        await marketplacePage.browseNext.click();
        await expectPage(page, index + 1);
      }
    });
  }

  test(`${noOffers.title}: the empty state`, async ({ mockApi, mockSession, marketplacePage }) => {
    mockMarketplace(mockApi, mockSession, offerListReply([]));

    await marketplacePage.open();

    await expect(marketplacePage.browseMessage).toHaveText(noOffers.message);
    await expect(marketplacePage.browseCards).toHaveCount(0);
    await expect(marketplacePage.browsePageButtons).toHaveText(noOffers.buttons);
    await expect(marketplacePage.browseNext).toBeDisabled();
  });

  test(
    `${serverError.title}: the API's message and an error in place of the list`,
    { annotation: [{ type: 'bug', description: `${serverError.bug.title} (${serverError.bug.file})` }] },
    async ({ mockApi, mockSession, marketplacePage }) => {
      mockMarketplace(mockApi, mockSession, fail(serverError.apiError, serverError.status));

      await marketplacePage.open();

      // The toast works today and proves the 500 reached the page. A 5xx shows it twice
      // (.qa/bugs/ghissue-15/ui-marketplace-browse--error-toast-shown-twice.md), so not counted.
      await expect(
        marketplacePage.notifications.filter({ hasText: serverError.apiError }).first(),
      ).toBeVisible();
      // Not breaking the page: the other calls of the load still render.
      await expect(marketplacePage.balance).toHaveText(serverError.balance);
      // Marked after the toast and the balance, so a broken mock is never an expected failure.
      test.fail(true, serverError.bug.title);

      await expect(marketplacePage.browseMessage).toHaveText(serverError.listMessage);
    },
  );
});
