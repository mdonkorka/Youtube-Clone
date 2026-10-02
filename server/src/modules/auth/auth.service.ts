import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../lib/tokens.js';
import { AppError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput, AuthSessionResponse } from './auth.types.js';

export async function isEmailAvailable(email: string): Promise<boolean> {
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });
  return !existingUser;
}

export async function registerUser(input: RegisterInput): Promise<AuthSessionResponse> {
  const existing = await prisma.users.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError('Email is already taken', 409, 'EMAIL_IN_USE');
  }

  const hashedPassword = await hashPassword(input.password);

  const newUser = await prisma.users.create({
    data: {
      first_name: input.firstName,
      surname: input.surname,
      email: input.email,
      password: hashedPassword,
    },
  });

  return createAuthSession(newUser);
}

export async function loginUser(input: LoginInput): Promise<AuthSessionResponse> {
  const user = await prisma.users.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await verifyPassword(user.password, input.password);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return createAuthSession(user);
}

export async function logoutUser(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload?.jti) {
      await prisma.refresh_tokens.deleteMany({
        where: { token: payload.jti },
      });
    }
  } catch {
  }
}

export async function refreshUserSession(rawToken?: string): Promise<AuthSessionResponse> {
  if (!rawToken) {
    throw new AppError('Invalid or expired session', 401, 'INVALID_REFRESH_TOKEN');
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new AppError('Invalid or expired session', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (!payload?.jti || payload.type !== 'refresh') {
    throw new AppError('Invalid or expired session', 401, 'INVALID_REFRESH_TOKEN');
  }

  const session = await prisma.refresh_tokens.findUnique({
    where: { token: payload.jti },
    include: { users: true },
  });

  if (!session || session.expires_at < new Date()) {
    if (session) {
      await prisma.refresh_tokens.deleteMany({ where: { id: session.id } });
    }
    throw new AppError('Invalid or expired session', 401, 'INVALID_REFRESH_TOKEN');
  }

  const { count } = await prisma.refresh_tokens.deleteMany({
    where: { id: session.id },
  });

  if (count === 0) {
    throw new AppError('Invalid or expired session', 401, 'INVALID_REFRESH_TOKEN');
  }

  return createAuthSession(session.users);
}

async function createAuthSession(user: {
  id: bigint;
  first_name: string;
  surname: string;
  email: string;
}): Promise<AuthSessionResponse> {
  const userIdStr = String(user.id);
  const accessToken = generateAccessToken(userIdStr);
  const { token: refreshToken, jti, expiresAt } = generateRefreshToken(userIdStr);

  await prisma.refresh_tokens.create({
    data: {
      user_id: user.id,
      token: jti,
      expires_at: expiresAt,
    },
  });

  return {
    user: {
      id: userIdStr,
      firstName: user.first_name,
      surname: user.surname,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}

