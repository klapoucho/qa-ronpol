import type { Locator } from '@playwright/test';
import type { FieldView } from '#src/assertions/ui-matchers.ts';

export type OfferCardField = 'type' | 'price' | 'name' | 'seller' | 'details' | 'description';

/**
 * One offer card, as Browse and My Offers render it. The card has no test ids or roles, so its
 * parts are found by their CSS classes (a documented last resort, README "How to add a test").
 */
export class OfferCard implements FieldView<OfferCardField> {
  readonly fields: Readonly<Record<OfferCardField, Locator>>;

  constructor(readonly root: Locator) {
    this.fields = {
      // "Field" or "Animal"
      type: root.locator('.offer-badge'),
      // "<price> ROL"
      price: root.locator('.offer-price'),
      // the item name, with " (Sold)", " (Cancelled)" or " (Unavailable)" after it
      name: root.locator('.offer-name'),
      // "Offered by: <seller's displayed name>"
      seller: root.locator('.offer-seller'),
      // "Field: <name>, Area: <area> ha" or "Type: <type>, Amount: <amount>"
      details: root.locator('.offer-meta'),
      description: root.locator('.offer-description'),
    };
  }
}
