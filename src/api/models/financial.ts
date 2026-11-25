import { z } from 'zod';

// POST /api/v1/financial/transactions with type income. The app requires a Luhn-valid card number
// and a CVV for income; neither is stored or returned.
export const incomeInputSchema = z.object({
  type: z.literal('income'),
  amount: z.number(),
  description: z.string(),
  category: z.string().optional(),
  cardNumber: z.string(),
  cvv: z.string(),
});
export type IncomeInput = z.infer<typeof incomeInputSchema>;

export const financialTransactionSchema = z.object({
  id: z.number().int(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  description: z.string(),
  category: z.string(),
  // Transfers store the other user's id here, as the caller passed it (string or number).
  referenceId: z.union([z.string(), z.number()]).nullable(),
  timestamp: z.string(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
});
export type FinancialTransaction = z.infer<typeof financialTransactionSchema>;

export const addTransactionResultSchema = z.object({ transaction: financialTransactionSchema });

// GET /api/v1/financial/account. The account also embeds its transactions; the history is read from
// GET /api/v1/financial/transactions instead, so they are not modelled here.
export const accountResultSchema = z.object({
  account: z.object({
    id: z.number().int(),
    userId: z.number().int(),
    balance: z.number(),
    currency: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

// GET /api/v1/financial/transactions, newest first.
export const transactionListSchema = z.object({
  transactions: z.array(financialTransactionSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});
