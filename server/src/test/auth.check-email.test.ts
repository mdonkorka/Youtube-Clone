import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { truncateDb } from './helpers.js';

describe('POST /api/auth/check-email', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 200 { available: true } when email is not registered', async () => {
    const response = await request(app)
      .post('/api/auth/check-email')
      .send({ email: 'newuser@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ available: true });
  });

  it('returns 409 { available: false } when email already exists', async () => {
    await prisma.users.create({
      data: {
        first_name: 'Existing',
        surname: 'User',
        email: 'taken@example.com',
        password: 'hashedpassword123',
      },
    });

    const response = await request(app)
      .post('/api/auth/check-email')
      .send({ email: 'taken@example.com' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      available: false,
      error: {
        message: 'Email is already taken',
        code: 'EMAIL_IN_USE',
      },
    });
  });

  it.each([
    {
      scenario: 'email format is invalid',
      payload: { email: 'not-an-email' },
      field: 'email',
      message: 'Invalid email address',
    },
    {
      scenario: 'email exceeds 255 characters',
      payload: { email: `${'a'.repeat(250)}@example.com` },
      field: 'email',
      message: 'Email must be 255 characters or less',
    },
  ])('returns 400 when $scenario', async ({ payload, field, message }) => {
    const response = await request(app)
      .post('/api/auth/check-email')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field, message }),
      ])
    );
  });
});

