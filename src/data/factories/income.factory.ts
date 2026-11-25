import type { IncomeInput } from '#src/api/models/financial.ts';

// A published Visa test number: the app accepts any Luhn-valid card for income and never stores it.
const TEST_CARD_NUMBER = '4111111111111111';

export function buildIncome(amount: number): IncomeInput {
  return {
    type: 'income',
    amount,
    description: 'QA seed funds',
    category: 'seed',
    cardNumber: TEST_CARD_NUMBER,
    cvv: '123',
  };
}
