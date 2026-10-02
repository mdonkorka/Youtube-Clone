import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { truncateDb, parseCookies } from './helpers.js';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 200 { user } and cookies for valid credentials', async () => {
    const passwordHash = await hashPassword('ValidPassword123');
    const user = await prisma.users.create({
      data: {
        first_name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        password: passwordHash,
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'ValidPassword123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: String(user.id),
        firstName: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
      },
    });

    const cookies = parseCookies(res.headers['set-cookie']);
    expect(cookies['access_token']).toBeDefined();
    expect(cookies['access_token']!.httponly).toBe('true');
    expect(cookies['access_token']!.path).toBe('/');

    expect(cookies['refresh_token']).toBeDefined();
    expect(cookies['refresh_token']!.httponly).toBe('true');
    expect(cookies['refresh_token']!.path).toBe('/api/auth');

    const sessionInDb = await prisma.refresh_tokens.findFirst({
      where: { user_id: user.id },
    });
    expect(sessionInDb).not.toBeNull();
  });
  it('returns 401 for incorrect password', async () => {
    const passwordHash = await hashPassword('CorrectPassword123');
    await prisma.users.create({
      data: {
        first_name: 'Jane',
        surname: 'Doe',
        email: 'jane.doe@example.com',
        password: passwordHash,
      },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane.doe@example.com',
        password: 'WrongPassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      },
    });
  });

  it('returns 401 for non-existent email (identical error message)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'SomePassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      },
    });
  });

  it.each([
    {
      scenario: 'email is missing',
      payload: { password: 'SomePassword123' },
      field: 'email',
    },
    {
      scenario: 'password is missing',
      payload: { email: 'user@example.com' },
      field: 'password',
    },
    {
      scenario: 'password exceeds 128 characters',
      payload: { email: 'user@example.com', password: 'a'.repeat(129) },
      field: 'password',
      message: 'Password must be 128 characters or less',
    },
  ])('returns 400 when $scenario', async ({ payload, field, message }) => {
    const response = await request(app)
      .post('/api/auth/login')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const expectedDetail = message ? { field, message } : { field };
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining(expectedDetail),
      ])
    );
  });
});


