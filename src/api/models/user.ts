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

// GET /api/v1/users/profile and GET /api/v1/authorization answer with this record. updatedAt
// appears once the user has logged in or changed the profile.
export const profileSchema = z.object({
  id: userId,
  email: z.string(),
  displayedName: z.string(),
  isActive: z.boolean(),
  lastLogin: z.string().nullable(),
  updatedAt: z.string().optional(),
});
export type UserProfile = z.infer<typeof profileSchema>;
