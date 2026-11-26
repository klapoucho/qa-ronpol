import type { ListedOffer } from '#src/api/models/marketplace.ts';
import { buildAnimalOffer, buildFieldOffer, MOCK_BALANCE } from '#src/mocks/payloads/marketplace.ts';
import type { OfferCardField } from '#src/ui/components/offer-card.ts';

// Cases of browse.spec.ts (T5: AC-8). Browse reads every active offer in one answer and builds the
// pages in the browser, 9 offers per page on load, so each mock answers with the whole list.

export type ExpectedPage = {
  /** Every offer whose card the page shows. */
  offerIds: number[];
  /** The pagination buttons, in order. */
  buttons: string[];
  /** The highlighted page number. */
  current: string;
};

export type ListingCase = {
  title: string;
  offers: ListedOffer[];
  /**
   * What cards of the first page show. Not the heading: it names the item by its id
   * (.qa/bugs/ghissue-13/ui-marketplace-browse--card-heading-shows-id.md); the details line names it.
   */
  cards: { offerId: number; shows: Partial<Record<Exclude<OfferCardField, 'name'>, string>> }[];
  /** The first page, then each page "Next »" leads to. */
  pages: [ExpectedPage, ...ExpectedPage[]];
};

const ids = (first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

// Every value differs between the cards, so a card showing another offer's data fails. The animal's
// whole-number price shows as the API sends it, "7 ROL".
const onePage: ListingCase = {
  title: 'a page of offers',
  offers: [
    buildFieldOffer(801, {
      price: 12.34,
      details: { name: 'Mock Meadow', area: 2.75 },
      sellerLabel: 'Mock Seller A',
      description: 'Meadow by the river',
    }),
    buildAnimalOffer(802, {
      price: 7,
      details: { type: 'cow', amount: 5 },
      sellerLabel: 'Mock Seller B',
      description: 'Dairy cows',
    }),
    buildFieldOffer(803, {
      price: 99.99,
      details: { name: 'Mock Orchard', area: 1.2 },
      sellerLabel: 'Mock Seller C',
      description: 'Apple orchard',
    }),
  ],
  cards: [
    {
      offerId: 801,
      shows: {
        type: 'Field',
        price: '12.34 ROL',
        seller: 'Offered by: Mock Seller A',
        details: 'Field: Mock Meadow, Area: 2.75 ha',
        description: 'Meadow by the river',
      },
    },
    {
      offerId: 802,
      shows: {
        type: 'Animal',
        price: '7 ROL',
        seller: 'Offered by: Mock Seller B',
        details: 'Type: cow, Amount: 5',
        description: 'Dairy cows',
      },
    },
    {
      offerId: 803,
      shows: {
        type: 'Field',
        price: '99.99 ROL',
        seller: 'Offered by: Mock Seller C',
        details: 'Field: Mock Orchard, Area: 1.2 ha',
        description: 'Apple orchard',
      },
    },
  ],
  pages: [{ offerIds: [801, 802, 803], buttons: ['« Prev', '1', 'Next »'], current: '1' }],
};

// Ten offers, the fewest that need a second page at 9 per page: page 2 holds exactly the last one.
// Never switch back to "9 per page" here: its option shows 10
// (.qa/bugs/ghissue-14/ui-marketplace-browse--nine-per-page-shows-ten.md).
const severalPages: ListingCase = {
  title: 'several pages',
  offers: ids(501, 510).map((id) => buildFieldOffer(id)),
  cards: [],
  pages: [
    { offerIds: ids(501, 509), buttons: ['« Prev', '1', '2', 'Next »'], current: '1' },
    { offerIds: [510], buttons: ['« Prev', '1', '2', 'Next »'], current: '2' },
  ],
};

// Nine offers fill exactly one page: no second page. Fails a page count that is off by one at an
// exact multiple of the page size, which the ten-offer row alone does not catch.
const fullPage: ListingCase = {
  title: 'a full page',
  offers: ids(601, 609).map((id) => buildFieldOffer(id)),
  cards: [],
  pages: [{ offerIds: ids(601, 609), buttons: ['« Prev', '1', 'Next »'], current: '1' }],
};

export const listings: ListingCase[] = [onePage, fullPage, severalPages];

export const noOffers = {
  title: 'no offers',
  message: 'No offers available',
  // The pagination still renders, on its only page.
  buttons: ['« Prev', '1', 'Next »'],
};

export const serverError = {
  title: 'a 500 error',
  status: 500,
  // The app's own error text for this endpoint; the page shows the text the API sends.
  apiError: 'Failed to get marketplace offers',
  // The page's own error state, which a 500 never reaches today.
  listMessage: 'Failed to load offers',
  // The rest of the page still loads: the balance from its own mocked call.
  balance: `${MOCK_BALANCE} ROL`,
  bug: {
    title:
      'When loading the offers fails, Browse shows "Loading offers..." forever; the error is only a toast that disappears after 6 s',
    file: '.qa/bugs/ghissue-15/ui-marketplace-browse--failed-load-spins-forever.md',
  },
};
