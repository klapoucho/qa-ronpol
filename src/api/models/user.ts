import { z } from 'zod';

const userId = z.number().int();

export const userSchema = z.object({
  id: userId,
  email: z.string(),
  displayedName: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const registerRequestSchema = z.object({
  email: z.string(),
  displayedName: z.string(),
  password: z.string(),
});
export type UserInput = z.infer<typeof registerRequestSchema>;

// Register and login answer with the user, a token and the ISO login time.
export const registerResultSchema = z.object({
  user: userSchema,
  token: z.string(),
  loginTime: z.string(),
});
export type RegisterResult = z.infer<typeof registerResultSchema>;

export const profileSchema = z.object({
  id: userId,
  email: z.string(),
  displayedName: z.string(),
});
export type UserProfile = z.infer<typeof profileSchema>;
