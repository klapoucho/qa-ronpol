import { BaseApi } from '#src/api/http/base-api.ts';
import {
  accountResultSchema,
  addTransactionResultSchema,
  transactionListSchema,
  type IncomeInput,
} from '#src/api/models/financial.ts';

export class FinancialApi extends BaseApi {
  account() {
    return this.get('financial/account', accountResultSchema);
  }

  /** Newest first. */
  transactions(limit = 100) {
    return this.get(`financial/transactions?limit=${limit}`, transactionListSchema);
  }

  addIncome(input: IncomeInput) {
    return this.post('financial/transactions', input, addTransactionResultSchema);
  }
}
