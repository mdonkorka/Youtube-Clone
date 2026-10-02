import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: ACCESS_TOKEN_MAX_AGE_MS,
};

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};

export const CLEAR_ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

export const CLEAR_REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/api/auth',
};

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export function generateAccessToken(userId: string): string {
  const secret: jwt.Secret | undefined = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
  const expiresIn = (process.env.ACCESS_TOKEN_TTL || '15m') as NonNullable<jwt.SignOptions['expiresIn']>;
  return jwt.sign({ sub: userId, type: 'access' }, secret, { expiresIn });
}

export function generateRefreshToken(userId: string): { token: string; jti: string; expiresAt: Date } {
  const secret: jwt.Secret | undefined = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
  const expiresIn = (process.env.REFRESH_TOKEN_TTL || '7d') as NonNullable<jwt.SignOptions['expiresIn']>;
  const token = jwt.sign({ sub: userId, jti, type: 'refresh' }, secret, { expiresIn });
  return { token, jti, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return jwt.verify(token, secret) as RefreshTokenPayload;
}
