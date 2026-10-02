import type { Request, Response, NextFunction } from 'express';
import { checkEmailSchema, registerSchema, loginSchema } from './auth.types.js';
import * as authService from './auth.service.js';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  CLEAR_ACCESS_COOKIE_OPTIONS,
  CLEAR_REFRESH_COOKIE_OPTIONS,
} from '../../lib/tokens.js';

export async function checkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = checkEmailSchema.parse(req.body);
    const available = await authService.isEmailAvailable(email);

    if (!available) {
      res.status(409).json({
        available: false,
        error: {
          message: 'Email is already taken',
          code: 'EMAIL_IN_USE',
        },
      });
      return;
    }

    res.status(200).json({ available: true });
  } catch (error) {
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.registerUser(input);

    res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.loginUser(input);

    res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    await authService.logoutUser(refreshToken);

    res.clearCookie(ACCESS_COOKIE_NAME, CLEAR_ACCESS_COOKIE_OPTIONS);
    res.clearCookie(REFRESH_COOKIE_NAME, CLEAR_REFRESH_COOKIE_OPTIONS);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME];
    const { user, accessToken, refreshToken } = await authService.refreshUserSession(rawToken);

    res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}
export function getMe(req: Request, res: Response): void {
  res.status(200).json({ user: req.user });
}





