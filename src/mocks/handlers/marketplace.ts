import { animalListSchema } from '#src/api/models/animal.ts';
import { fieldListSchema } from '#src/api/models/field.ts';
import {
  accountResultSchema,
  financialStatsResultSchema,
  marketplaceStatsSchema,
} from '#src/api/models/financial.ts';
import {
  listedOfferListSchema,
  marketplaceTransactionListSchema,
  type ListedOffer,
} from '#src/api/models/marketplace.ts';
import { statisticsSchema } from '#src/api/models/statistics.ts';
import type { MockApi, MockReply } from '#src/mocks/mock-api.ts';
import {
  buildAccount,
  viewerFinancialStats,
  emptyMarketplaceStats,
  emptyStatistics,
} from '#src/mocks/payloads/marketplace.ts';
import { bare, ok } from '#src/mocks/replies.ts';
import type { Session } from '#src/ui/session.ts';

/** The answer to `GET /api/v1/marketplace/offers` or `/my-offers` with the whole list (the page paginates). */
export function offerListReply(offers: ListedOffer[]): MockReply {
  return ok(listedOfferListSchema.parse({ offers, total: offers.length }));
}

/**
 * Answers every call the Marketplace page makes on load. The user owns no fields or animals and has
 * no offers or trades; Browse gets `offers`. Unanswered, each call would get the network guard's
 * 501, which the page shows as an error toast. A test can replace any of them afterwards with
 * `api.on` for the same method and path.
 */
export function mockMarketplace(api: MockApi, session: Session, offers: MockReply): void {
  api
    .on('GET', '/api/v1/marketplace/offers', offers)
    .on('GET', '/api/v1/financial/account', ok(accountResultSchema.parse(buildAccount(session.userId))))
    // Empty: a viewer's own item with an offer's itemId would rename that card's heading.
    .on('GET', '/api/v1/fields', ok(fieldListSchema.parse([])))
    .on('GET', '/api/v1/animals', ok(animalListSchema.parse([])))
    .on('GET', '/api/v1/marketplace/my-offers', offerListReply([]))
    .on(
      'GET',
      '/api/v1/marketplace/transactions',
      ok(marketplaceTransactionListSchema.parse({ transactions: [], total: 0 })),
    )
    .on('GET', '/api/v1/financial/stats', ok(financialStatsResultSchema.parse(viewerFinancialStats)))
    .on('GET', '/api/v1/financial/marketplace-stats', ok(marketplaceStatsSchema.parse(emptyMarketplaceStats)))
    // Read with a plain fetch, outside the envelope.
    .on('GET', '/api/v1/statistics', bare(statisticsSchema.parse(emptyStatistics)));
}
