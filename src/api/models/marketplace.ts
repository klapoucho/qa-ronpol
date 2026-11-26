import { z } from 'zod';
import { successEnvelope } from '#src/api/models/envelope.ts';

const itemType = z.enum(['field', 'animal']);

export const offerInputSchema = z.object({
  itemType,
  itemId: z.number().int(),
  price: z.number(),
  description: z.string().optional(),
});
export type OfferInput = z.infer<typeof offerInputSchema>;
/** A field or an animal group, as an offer refers to it. */
export type OfferItem = Pick<OfferInput, 'itemType' | 'itemId'>;

// Browse and My Offers add `details` and `sellerLabel` to each offer; listedOfferSchema models them.
export const offerSchema = offerInputSchema.extend({
  id: z.number().int(),
  sellerId: z.number().int(),
  // unavailable: the item went in use or was deleted while listed.
  status: z.enum(['active', 'cancelled', 'sold', 'unavailable']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Offer = z.infer<typeof offerSchema>;

// GET /api/v1/marketplace/offers and GET /api/v1/marketplace/my-offers
export const offerListSchema = z.object({ offers: z.array(offerSchema), total: z.number().int() });

// An offer as Browse and My Offers list it: the item's details, which depend on the item type, and
// the seller's displayed name. The API clients read offerListSchema; mocks of these lists use this one.
const listedOfferBase = offerSchema.extend({ sellerLabel: z.string() });
export const listedOfferSchema = z.discriminatedUnion('itemType', [
  listedOfferBase.extend({
    itemType: z.literal('field'),
    details: z.object({ name: z.string(), area: z.number() }),
  }),
  listedOfferBase.extend({
    itemType: z.literal('animal'),
    details: z.object({ type: z.string(), amount: z.number().int() }),
  }),
]);
export type ListedOffer = z.infer<typeof listedOfferSchema>;

export const listedOfferListSchema = offerListSchema.extend({ offers: z.array(listedOfferSchema) });

// Bug .qa/bugs/ghissue-11/post-api-marketplace-offers--create-offer-status-in-message.md:
// POST /marketplace/offers answers HTTP 200 with a numeric top-level `message` (201), which the
// shared envelope rejects. This schema reads the whole envelope, accepts a string or a number
// there, and returns `data`, so the call keeps working once the bug is fixed.
export const createOfferEnvelopeSchema = successEnvelope(
  z.object({ offer: offerSchema, message: z.string().optional() }),
)
  .extend({ message: z.union([z.string(), z.number()]).optional() })
  .transform((envelope) => envelope.data);

// DELETE /api/v1/marketplace/offers/{offerId}: the message sits inside `data`, while the OpenAPI
// spec puts it at the top level (.qa/bugs/ghissue-12/post-api-marketplace-offers--openapi-write-ops-differ.md).
export const cancelOfferResultSchema = z.object({ message: z.string() });

export const marketplaceTransactionSchema = z.object({
  id: z.number().int(),
  offerId: z.number().int(),
  sellerId: z.number().int(),
  buyerId: z.number().int(),
  itemType,
  itemId: z.number().int(),
  price: z.number(),
  status: z.string(),
  createdAt: z.string(),
});
export type MarketplaceTransaction = z.infer<typeof marketplaceTransactionSchema>;

// POST /api/v1/marketplace/buy
export const buyResultSchema = z.object({ transaction: marketplaceTransactionSchema, message: z.string() });

// GET /api/v1/marketplace/transactions: an object, not the bare array the OpenAPI spec describes.
export const marketplaceTransactionListSchema = z.object({
  transactions: z.array(marketplaceTransactionSchema),
  total: z.number().int(),
});
