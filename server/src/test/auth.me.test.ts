import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { generateAccessToken } from '../lib/tokens.js';
import { truncateDb, parseCookies } from './helpers.js';

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 200 { user } when a valid access token cookie is provided', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Elena',
        surname: 'Rostova',
        email: 'elena@example.com',
        password: 'Password123',
      });

    const parsedCookies = parseCookies(regRes.headers['set-cookie']);
    const accessTokenCookie = `access_token=${parsedCookies['access_token']!.value}`;

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [accessTokenCookie]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        firstName: 'Elena',
        surname: 'Rostova',
        email: 'elena@example.com',
      },
    });
  });

  it('returns 401 when access token cookie is missing', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
  });

  it('returns 401 when access token cookie is malformed', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['access_token=bogus.jwt.token']);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
  });

  it('returns 401 when token has valid signature but user does not exist in DB', async () => {
    const orphanToken = generateAccessToken('99999999');
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${orphanToken}`]);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
  });

  it('returns 401 when token has valid signature but non-numeric sub', async () => {
    const nonNumericSubToken = jwt.sign(
      { sub: 'not-a-number', type: 'access' },
      process.env.JWT_ACCESS_SECRET!
    );
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${nonNumericSubToken}`]);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
    });
  });
});

