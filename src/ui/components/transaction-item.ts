import type { Locator } from '@playwright/test';
import type { FieldView } from '#src/assertions/ui-matchers.ts';

export type TransactionItemField = 'type' | 'amount';

/**
 * One entry of the Marketplace Transaction History. It has no test ids or roles, so its parts are
 * found by their CSS classes (a documented last resort). The date is left out: it is rendered
 * with the browser's locale.
 */
export class TransactionItem implements FieldView<TransactionItemField> {
  readonly fields: Readonly<Record<TransactionItemField, Locator>>;

  constructor(readonly root: Locator) {
    this.fields = {
      // "Purchase: <item>" or "Sale: <item>"
      type: root.locator('.transaction-type'),
      // "-<price> ROL" for the buyer, "+<price> ROL" for the seller
      amount: root.locator('.transaction-amount'),
    };
  }
}
