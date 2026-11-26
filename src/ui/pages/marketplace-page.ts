import type { Locator, Page, Request, Response } from '@playwright/test';
import type { OfferInput } from '#src/api/models/marketplace.ts';
import { ConfirmationModal } from '#src/ui/components/confirmation-modal.ts';
import { OfferCard } from '#src/ui/components/offer-card.ts';

/** A purchase confirmed in the modal. */
export type Purchase = {
  /** The answer to `POST /api/v1/marketplace/buy`. */
  response: Response;
  /** Settles once Browse has read the offers again, which the page does only after a successful buy. */
  browseReloaded: Promise<void>;
};

// The page has test ids only on the nav links and the confirmation modal. Tabs, form and cards are
// found by role and label inside their containers; the containers have no role, so they are CSS.
export class MarketplacePage {
  /** Toasts: role="alert", title "Success" or "Error", visible for 6 s, at most 3 at a time. */
  readonly notifications: Locator;
  /** "Your Balance": "<balance> ROL". No test id, role or label, so CSS. */
  readonly balance: Locator;
  readonly confirmation: ConfirmationModal;
  /** Transaction History entries, newest first; rendered while the tab is hidden too. */
  readonly transactions: Locator;
  /** Browse's cards on the current page. */
  readonly browseCards: Locator;
  /**
   * What Browse shows in place of cards: "No offers available" for an empty list, "Failed to load
   * offers" with a warning icon for an answer the page cannot read. No test id or role, so CSS.
   */
  readonly browseMessage: Locator;
  /** Browse's pagination buttons in order: "« Prev", up to 5 page numbers, "Next »". */
  readonly browsePageButtons: Locator;
  readonly browsePrev: Locator;
  readonly browseNext: Locator;
  /** The highlighted page number; marked only by the class "active" (no aria-current), so CSS. */
  readonly browseCurrentPage: Locator;
  private readonly tabs: Locator;
  private readonly createForm: Locator;
  private readonly myOffers: Locator;
  private readonly browseOffers: Locator;
  private readonly browsePagination: Locator;

  constructor(private readonly page: Page) {
    this.notifications = page.getByRole('alert');
    this.balance = page.locator('#userBalance');
    this.confirmation = new ConfirmationModal(page);
    this.transactions = page.locator('#transactionsList .transaction-item');
    this.tabs = page.locator('.marketplace-tabs');
    this.createForm = page.locator('#createOfferForm');
    this.myOffers = page.locator('#myOffers');
    this.browseOffers = page.locator('#browseOffers');
    this.browseCards = this.browseOffers.locator('.offer-card');
    this.browseMessage = this.browseOffers.locator('.empty-state');
    // Rebuilt on every page change; locators re-resolve, element handles would go stale.
    this.browsePagination = page.locator('#offersPagination');
    this.browsePageButtons = this.browsePagination.getByRole('button');
    this.browseCurrentPage = this.browsePagination.locator('button.active');
    this.browsePrev = this.browsePageButton('« Prev');
    this.browseNext = this.browsePageButton('Next »');
  }

  /**
   * Opens the page and waits until it has read the user's fields, animals and balance and the
   * offers to browse. It reads them once, on load: the Item list of Create Offer is built from
   * what it has when Item Type changes, so a type picked before they arrive leaves it empty for
   * good, and the balance shows "Loading..." until its answer arrives.
   */
  async goto(): Promise<void> {
    await Promise.all([
      this.loaded('/api/v1/fields'),
      this.loaded('/api/v1/animals'),
      this.loaded('/api/v1/financial/account'),
      // Every active offer of every user, in one answer of several hundred KB.
      this.loaded('/api/v1/marketplace/offers'),
      this.page.goto('/marketplace.html'),
    ]);
  }

  /**
   * Opens the page without waiting for its data, for a mocked API whose answer may be an error.
   * Browse shows "Loading offers..." until the offers are handled: assert the state you expect.
   */
  async open(): Promise<void> {
    await this.page.goto('/marketplace.html');
  }

  /** The toast with this text. */
  notification(text: string): Locator {
    return this.notifications.filter({ hasText: text });
  }

  /** One Browse pagination button by its exact name, such as a page number. */
  browsePageButton(name: string): Locator {
    return this.browsePagination.getByRole('button', { name, exact: true });
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

  async openTransactionHistory(): Promise<void> {
    await this.tabs.getByRole('button', { name: 'Transaction History' }).click();
  }

  /** The seller's card for one offer; My Offers lists every status, oldest first. */
  myOfferCard(offerId: number): OfferCard {
    return this.offerCard(this.myOffers, offerId);
  }

  /** Narrows Browse to the offers whose text contains `text`, in the browser, from page 1. */
  async filterOffers(text: string): Promise<void> {
    // No test id or label; the placeholder is the only user-facing name.
    await this.page.getByPlaceholder('Filter offers by any text...').fill(text);
  }

  /** Another user's card for one active offer in Browse (oldest first, 9 per page). */
  browseCard(offerId: number): OfferCard {
    return this.offerCard(this.browseOffers, offerId);
  }

  /** Clicks the card's Buy Now, which opens the confirmation; nothing is bought yet. */
  async startPurchase(offerId: number): Promise<void> {
    await this.browseCard(offerId).root.getByRole('button', { name: 'Buy Now' }).click();
  }

  /**
   * Confirms the purchase in the modal and resolves once the buy's answer has arrived (about 4 s,
   * longer while other buys hold the app's ledger lock). The page then shows a toast and reloads
   * the balance, the offers and the history.
   */
  async confirmPurchase(): Promise<Purchase> {
    const bought = this.answer('POST', '/api/v1/marketplace/buy');
    await this.confirmation.confirm.click();
    const response = await bought;
    // Waited for apart from the buy, so the 6 s success toast can be checked before a slow reload ends.
    // Registered after the buy's answer is safe: the page asks for the offers only after it has read that answer.
    const browseReloaded = response.ok() ? this.loaded('/api/v1/marketplace/offers') : Promise.resolve();
    // Marked as handled, so a test that fails before awaiting it does not also report a rejection.
    void browseReloaded.catch(() => undefined);
    return { response, browseReloaded };
  }

  private offerCard(container: Locator, offerId: number): OfferCard {
    return new OfferCard(
      container
        .locator('.offer-card')
        .filter({ has: this.page.locator(`button[data-offer-id="${offerId}"]`) }),
    );
  }

  /**
   * The answer to the page's next `<method> <path>`. Throws when the request ends without one, as
   * when the page gives up on it after 15 s, instead of waiting for the test's timeout.
   */
  private answer(method: string, path: string): Promise<Response> {
    const matches = (request: Request) =>
      request.method() === method && new URL(request.url()).pathname === path;
    return Promise.race([
      this.page.waitForResponse((response) => matches(response.request())),
      this.page.waitForEvent('requestfailed', matches).then((request) => {
        throw new Error(
          `${method} ${path} got no answer: ${request.failure()?.errorText ?? 'request failed'}`,
        );
      }),
    ]);
  }

  /** Waits until the page has read the whole answer to `GET <path>`. */
  private async loaded(path: string): Promise<void> {
    const response = await this.answer('GET', path);
    // A refused load (for example a rejected session) must not surface later as missing data.
    if (!response.ok()) {
      throw new Error(`Marketplace could not load ${path}: HTTP ${response.status()}`);
    }
    // The body too: on a slow connection the offers take seconds to arrive after their headers.
    const failure = await response.finished();
    if (failure) {
      throw new Error(`Marketplace could not load ${path}: ${failure.message}`);
    }
  }
}
