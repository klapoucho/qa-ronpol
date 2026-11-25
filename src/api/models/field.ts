import { z } from 'zod';

export const fieldInputSchema = z.object({
  name: z.string(),
  area: z.number(),
});
export type FieldInput = z.infer<typeof fieldInputSchema>;

// POST /api/v1/fields answers with this record; GET /api/v1/fields with a bare array of them.
export const fieldSchema = fieldInputSchema.extend({
  id: z.number().int(),
  userId: z.number().int(),
});
export type Field = z.infer<typeof fieldSchema>;

export const fieldListSchema = z.array(fieldSchema);
