import type { Page } from '@playwright/test';
import type { FieldView } from '#src/assertions/ui-matchers.ts';

export class ProfilePage {
  readonly details: FieldView<'email' | 'displayedName'>;

  constructor(private readonly page: Page) {
    this.details = {
      fields: {
        email: page.getByTestId('email-value'),
        displayedName: page.getByTestId('displayed-name'),
      },
    };
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile.html');
  }
}
