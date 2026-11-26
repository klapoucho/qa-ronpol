import { z } from 'zod';

// GET /api/v1/statistics answers with a bare object, not the envelope: totals across the whole app.
// The Marketplace header reads only `totalValue`; the `advanced` averages are not modelled.
export const statisticsSchema = z.object({
  users: z.number().int(),
  farms: z.number().int(),
  area: z.number(),
  staff: z.number().int(),
  animals: z.number().int(),
  avgStaffAge: z.number(),
  offers: z.number().int(),
  totalValue: z.number(),
});
export type Statistics = z.infer<typeof statisticsSchema>;
