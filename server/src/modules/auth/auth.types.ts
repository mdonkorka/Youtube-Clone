import { z } from 'zod';

export const checkEmailSchema = z.object({
  email: z.string().trim().toLowerCase().max(255, 'Email must be 255 characters or less').email('Invalid email address'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100, 'First name must be 100 characters or less'),
  surname: z.string().trim().min(1, 'Surname is required').max(100, 'Surname must be 100 characters or less'),
  email: z.string().trim().toLowerCase().max(255, 'Email must be 255 characters or less').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(255, 'Email must be 255 characters or less').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password must be 128 characters or less'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;

export type CheckEmailInput = z.infer<typeof checkEmailSchema>;

export interface CheckEmailSuccessResponse {
  available: boolean;
}

export interface SafeUser {
  id: string;
  firstName: string;
  surname: string;
  email: string;
}

export interface AuthSessionResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}
