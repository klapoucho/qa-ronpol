import type { APIRequestContext } from '@playwright/test';
import { AnimalsApi } from '#src/api/clients/animals-api.ts';
import { FieldsApi } from '#src/api/clients/fields-api.ts';
import { FinancialApi } from '#src/api/clients/financial-api.ts';
import { MarketplaceApi } from '#src/api/clients/marketplace-api.ts';
import { UsersApi } from '#src/api/clients/users-api.ts';
import type { Animal, AnimalInput } from '#src/api/models/animal.ts';
import type { Field, FieldInput } from '#src/api/models/field.ts';
import type { FinancialTransaction } from '#src/api/models/financial.ts';
import type { MarketplaceTransaction, Offer, OfferInput } from '#src/api/models/marketplace.ts';
import type { RegisterResult, User, UserInput } from '#src/api/models/user.ts';
import { buildAnimal } from '#src/data/factories/animal.factory.ts';
import { buildField } from '#src/data/factories/field.factory.ts';
import { buildIncome } from '#src/data/factories/income.factory.ts';
import { buildOffer } from '#src/data/factories/offer.factory.ts';

type OfferOverrides = Partial<Pick<OfferInput, 'price' | 'description'>>;

/**
 * A registered user and the API as that user.
 *
 * `api` holds the API clients. A call through it returns the response, refused or not: use it for
 * the call a test is about.
 *
 * The other methods are shortcuts for preparing data and reading state. They return the data and
 * throw when the app refuses the call, so a broken setup never looks like a tested refusal.
 */
export class TestUser {
  readonly id: User['id'];
  readonly token: string;
  readonly loginTime: string;
  readonly api: {
    users: UsersApi;
    fields: FieldsApi;
    animals: AnimalsApi;
    financial: FinancialApi;
    marketplace: MarketplaceApi;
  };

  constructor(
    request: APIRequestContext,
    /** What the user registered with. */
    readonly input: UserInput,
    registered: RegisterResult,
  ) {
    this.id = registered.user.id;
    this.token = registered.token;
    this.loginTime = registered.loginTime;
    this.api = {
      users: new UsersApi(request, this.token),
      fields: new FieldsApi(request, this.token),
      animals: new AnimalsApi(request, this.token),
      financial: new FinancialApi(request, this.token),
      marketplace: new MarketplaceApi(request, this.token),
    };
  }

  // ---------- preparing data ----------

  /** New users have 0 ROL. The app runs money operations one at a time, about 2 s each. */
  async addFunds(amount: number): Promise<void> {
    void (await this.api.financial.addIncome(buildIncome(amount))).data;
  }

  async createField(overrides?: Partial<FieldInput>): Promise<Field> {
    return (await this.api.fields.create(buildField(overrides))).data;
  }

  /** A group of animals that stands on no field, so it can be offered for sale. */
  async createAnimal(overrides?: Partial<AnimalInput>): Promise<Animal> {
    return (await this.api.animals.create(buildAnimal(overrides))).data;
  }

  async offerField(field: Field, overrides?: OfferOverrides): Promise<Offer> {
    const offer = buildOffer({ itemType: 'field', itemId: field.id }, overrides);
    return (await this.api.marketplace.createOffer(offer)).data.offer;
  }

  async offerAnimal(animal: Animal, overrides?: OfferOverrides): Promise<Offer> {
    const offer = buildOffer({ itemType: 'animal', itemId: animal.id }, overrides);
    return (await this.api.marketplace.createOffer(offer)).data.offer;
  }

  async cancelOffer(offer: Offer): Promise<void> {
    void (await this.api.marketplace.cancel(offer.id)).data;
  }

  // ---------- reading state ----------

  async balance(): Promise<number> {
    return (await this.api.financial.account()).data.account.balance;
  }

  async fields(): Promise<Field[]> {
    return (await this.api.fields.list()).data;
  }

  async animals(): Promise<Animal[]> {
    return (await this.api.animals.list()).data;
  }

  /** The user's own offers in every status, oldest first. */
  async myOffers(): Promise<Offer[]> {
    return (await this.api.marketplace.myOffers()).data.offers;
  }

  /** The active offers of every other user, as Browse lists them. */
  async browseOffers(): Promise<Offer[]> {
    return (await this.api.marketplace.offers()).data.offers;
  }

  /** The user's sales and purchases. */
  async marketplaceHistory(): Promise<MarketplaceTransaction[]> {
    return (await this.api.marketplace.transactions()).data.transactions;
  }

  /** Every income and expense of the user, newest first. */
  async financialHistory(): Promise<FinancialTransaction[]> {
    return (await this.api.financial.transactions()).data.transactions;
  }

  /**
   * Everything the user has: money, items, offers and both histories. Read it before and after a
   * call the app must refuse, and compare the two to prove that nothing changed.
   */
  async everything() {
    const [balance, fields, animals, myOffers, marketplaceHistory, financialHistory] = await Promise.all([
      this.balance(),
      this.fields(),
      this.animals(),
      this.myOffers(),
      this.marketplaceHistory(),
      this.financialHistory(),
    ]);
    return { balance, fields, animals, myOffers, marketplaceHistory, financialHistory };
  }
}
