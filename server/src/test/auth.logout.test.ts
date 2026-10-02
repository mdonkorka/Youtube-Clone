import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { truncateDb, parseCookies } from './helpers.js';

describe('POST /api/auth/logout', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 204, removes session from DB, and clears both cookies', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Charlie',
        surname: 'Brown',
        email: 'charlie@example.com',
        password: 'Password123',
      });

    const cookies = regRes.headers['set-cookie'];
    const parsedCookies = parseCookies(cookies);
    const refreshTokenCookie = `refresh_token=${parsedCookies['refresh_token']!.value}`;
    const accessTokenCookie = `access_token=${parsedCookies['access_token']!.value}`;

    const userInDb = await prisma.users.findUnique({
      where: { email: 'charlie@example.com' },
    });
    const sessionBefore = await prisma.refresh_tokens.findFirst({
      where: { user_id: userInDb!.id },
    });
    expect(sessionBefore).not.toBeNull();

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [accessTokenCookie, refreshTokenCookie]);

    expect(logoutRes.status).toBe(204);

    const sessionAfter = await prisma.refresh_tokens.findFirst({
      where: { user_id: userInDb!.id },
    });
    expect(sessionAfter).toBeNull();

    const clearedCookies = logoutRes.headers['set-cookie'];
    expect(clearedCookies).toBeDefined();
    const parsedCleared = parseCookies(clearedCookies);
    expect(parsedCleared['access_token']).toBeDefined();
    expect(parsedCleared['refresh_token']).toBeDefined();
    expect(parsedCleared['access_token']!.value).toBe('');
    expect(parsedCleared['refresh_token']!.value).toBe('');
    expect(new Date(parsedCleared['access_token']!['expires']!).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(parsedCleared['refresh_token']!['expires']!).getTime()).toBeLessThanOrEqual(Date.now());
  });
  it('returns 204 idempotently even when called without cookies', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
  });

});
