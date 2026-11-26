import { BaseApi } from '#src/api/http/base-api.ts';
import {
  buyResultSchema,
  cancelOfferResultSchema,
  createOfferEnvelopeSchema,
  marketplaceTransactionListSchema,
  offerListSchema,
  type OfferInput,
} from '#src/api/models/marketplace.ts';

export class MarketplaceApi extends BaseApi {
  /** Active offers of other users, demo users' offers included. */
  offers() {
    return this.get('marketplace/offers', offerListSchema);
  }

  myOffers() {
    return this.get('marketplace/my-offers', offerListSchema);
  }

  // The schema unwraps the envelope itself because of the numeric `message` bug (see the schema).
  createOffer(input: OfferInput) {
    return this.createOfferUnchecked(input);
  }

  /** Sends the body as is, for refusal tests that need a value `OfferInput` does not allow. */
  createOfferUnchecked(body: Record<string, unknown>) {
    return this.post('marketplace/offers', body, createOfferEnvelopeSchema, { envelope: false });
  }

  cancel(offerId: number) {
    return this.delete(`marketplace/offers/${offerId}`, cancelOfferResultSchema);
  }

  buy(offerId: number) {
    return this.post('marketplace/buy', { offerId }, buyResultSchema);
  }

  transactions() {
    return this.get('marketplace/transactions', marketplaceTransactionListSchema);
  }
}
