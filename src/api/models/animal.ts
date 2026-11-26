import { z } from 'zod';

// POST /api/v1/animals. `type` is a key of GET /api/v1/animals/types; an animal group placed on a
// field (`fieldId`) cannot be offered on the Marketplace.
export const animalInputSchema = z.object({
  type: z.string(),
  amount: z.number().int(),
  fieldId: z.number().int().nullish(),
});
export type AnimalInput = z.infer<typeof animalInputSchema>;

export const animalSchema = animalInputSchema.extend({
  id: z.number().int(),
  userId: z.number().int(),
  createdAt: z.string(),
});
export type Animal = z.infer<typeof animalSchema>;

// GET /api/v1/animals answers with a bare array of the user's animal groups.
export const animalListSchema = z.array(animalSchema);
