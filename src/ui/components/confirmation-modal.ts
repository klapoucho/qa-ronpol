import type { Locator, Page } from '@playwright/test';

/** The page's one confirmation dialog, reused for buying and cancelling an offer. */
export class ConfirmationModal {
  /** Shown with display:flex, hidden with display:none. */
  readonly root: Locator;
  readonly title: Locator;
  readonly message: Locator;
  /** Labelled after the action ("Buy Now"), like the card button that opened the dialog: use this one. */
  readonly confirm: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('confirmation-modal');
    this.title = page.getByTestId('confirmation-modal-title');
    this.message = page.getByTestId('confirmation-modal-message');
    this.confirm = page.getByTestId('confirmation-modal-confirm');
  }
}
