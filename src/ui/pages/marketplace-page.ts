import type { Locator, Page } from '@playwright/test';
import type { OfferInput } from '#src/api/models/marketplace.ts';
import { OfferCard } from '#src/ui/components/offer-card.ts';

// The page has test ids only on the nav links and the confirmation modal. Tabs, form and cards are
// found by role and label inside their containers; the containers have no role, so they are CSS.
export class MarketplacePage {
  /** Toasts: role="alert", title "Success" or "Error", visible for 6 s, at most 3 at a time. */
  readonly notifications: Locator;
  private readonly tabs: Locator;
  private readonly createForm: Locator;
  private readonly myOffers: Locator;

  constructor(private readonly page: Page) {
    this.notifications = page.getByRole('alert');
    this.tabs = page.locator('.marketplace-tabs');
    this.createForm = page.locator('#createOfferForm');
    this.myOffers = page.locator('#myOffers');
  }

  /**
   * Opens the page and waits until it has read the user's fields and animals. It reads them once,
   * on load, and builds the Item list from what it has when Item Type changes: a type picked
   * before they arrive leaves the list empty for good.
   */
  async goto(): Promise<void> {
    const loaded = (path: string) =>
      this.page
        .waitForResponse(
          (response) => response.request().method() === 'GET' && new URL(response.url()).pathname === path,
        )
        .then((response) => {
          // A refused load (for example a rejected session) must not surface later as an empty Item list.
          if (!response.ok()) {
            throw new Error(`Marketplace could not load ${path}: HTTP ${response.status()}`);
          }
        });
    await Promise.all([
      loaded('/api/v1/fields'),
      loaded('/api/v1/animals'),
      this.page.goto('/marketplace.html'),
    ]);
  }

  /** Fills Create Offer with the seller's own item and submits it once. */
  async createOffer(offer: OfferInput): Promise<void> {
    await this.tabs.getByRole('button', { name: 'Create Offer' }).click();
    await this.createForm.getByLabel('Item Type').selectOption(offer.itemType);
    // Waits for the option: the list is rebuilt after Item Type changes.
    await this.createForm.getByLabel('Item', { exact: true }).selectOption(String(offer.itemId));
    await this.createForm.getByLabel('Price (ROL)').fill(String(offer.price));
    await this.createForm.getByLabel('Description (optional)').fill(offer.description ?? '');
    await this.createForm.getByRole('button', { name: 'Create Offer' }).click();
  }

  async openMyOffers(): Promise<void> {
    await this.tabs.getByRole('button', { name: 'My Offers' }).click();
  }

  /** The seller's card for one offer; My Offers lists every status, oldest first. */
  myOfferCard(offerId: number): OfferCard {
    return new OfferCard(
      this.myOffers
        .locator('.offer-card')
        .filter({ has: this.page.locator(`button[data-offer-id="${offerId}"]`) }),
    );
  }
}
