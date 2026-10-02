import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { generateRefreshToken } from '../lib/tokens.js';
import { truncateDb, parseCookies } from './helpers.js';

describe('POST /api/auth/refresh', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 200 { user }, invalidates old token, issues new tokens and DB record', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Diana',
        surname: 'Prince',
        email: 'diana@example.com',
        password: 'Password123',
      });

    const parsedRegCookies = parseCookies(regRes.headers['set-cookie']);
    const oldRefreshTokenCookie = `refresh_token=${parsedRegCookies['refresh_token']!.value}`;
    const userInDb = await prisma.users.findUnique({
      where: { email: 'diana@example.com' },
    });

    const initialSession = await prisma.refresh_tokens.findFirst({
      where: { user_id: userInDb!.id },
    });
    expect(initialSession).not.toBeNull();

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldRefreshTokenCookie]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body).toEqual({
      user: {
        id: String(userInDb!.id),
        firstName: 'Diana',
        surname: 'Prince',
        email: 'diana@example.com',
      },
    });

    const newCookies = parseCookies(refreshRes.headers['set-cookie']);
    expect(newCookies['access_token']).toBeDefined();
    expect(newCookies['refresh_token']).toBeDefined();
    expect(newCookies['refresh_token']!.value).not.toBe(parsedRegCookies['refresh_token']!.value);

    const oldSessionInDb = await prisma.refresh_tokens.findUnique({
      where: { id: initialSession!.id },
    });
    expect(oldSessionInDb).toBeNull();

    const allSessions = await prisma.refresh_tokens.findMany({
      where: { user_id: userInDb!.id },
    });
    expect(allSessions).toHaveLength(1);
    expect(allSessions[0]!.id).not.toBe(initialSession!.id);
  });

  it('returns 401 when refresh token cookie is missing', async () => {
    const response = await request(app).post('/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Invalid or expired session',
        code: 'INVALID_REFRESH_TOKEN',
      },
    });
  });

  it('returns 401 when refresh token is malformed', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=invalid.jwt.token']);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when refresh token has valid signature but is not found in DB', async () => {
    const orphanToken = generateRefreshToken('99999').token;
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${orphanToken}`]);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when concurrent refresh deletes session before rotation', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Diana',
        surname: 'Prince',
        email: 'diana2@example.com',
        password: 'Password123',
      });

    const parsedRegCookies = parseCookies(regRes.headers['set-cookie']);
    const refreshTokenCookie = `refresh_token=${parsedRegCookies['refresh_token']!.value}`;

    const deleteManySpy = vi.spyOn(prisma.refresh_tokens, 'deleteMany').mockResolvedValueOnce({ count: 0 });

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    deleteManySpy.mockRestore();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Invalid or expired session',
        code: 'INVALID_REFRESH_TOKEN',
      },
    });
  });
});

