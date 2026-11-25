import { z } from 'zod';

export function successEnvelope<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    timestamp: z.string(),
    data: dataSchema,
    message: z.string().optional(),
  });
}

export const errorEnvelope = z.object({
  success: z.literal(false),
  timestamp: z.string(),
  error: z.string(),
  details: z.unknown().optional(),
});
