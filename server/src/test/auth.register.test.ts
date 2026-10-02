import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';
import { truncateDb, parseCookies } from './helpers.js';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await truncateDb();
  });

  it('returns 201 { user }, sets HttpOnly cookies, and stores Argon2 hash in DB', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Alice',
        surname: 'Smith',
        email: 'alice@example.com',
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      user: {
        id: expect.any(String),
        firstName: 'Alice',
        surname: 'Smith',
        email: 'alice@example.com',
      },
    });

    const userInDb = await prisma.users.findUnique({
      where: { email: 'alice@example.com' },
    });
    expect(userInDb).not.toBeNull();
    expect(userInDb?.first_name).toBe('Alice');
    expect(userInDb?.surname).toBe('Smith');
    expect(await argon2.verify(userInDb!.password, 'Password123')).toBe(true);

    const cookies = parseCookies(res.headers['set-cookie']);
    expect(cookies['access_token']).toBeDefined();
    expect(cookies['access_token']!.httponly).toBe('true');
    expect(cookies['access_token']!.path).toBe('/');

    expect(cookies['refresh_token']).toBeDefined();
    expect(cookies['refresh_token']!.httponly).toBe('true');
    expect(cookies['refresh_token']!.path).toBe('/api/auth');

    const sessionInDb = await prisma.refresh_tokens.findFirst({
      where: { user_id: userInDb!.id },
    });
    expect(sessionInDb).not.toBeNull();
  });

  it.each([
    {
      scenario: 'firstName is empty',
      payload: {
        firstName: '',
        surname: 'Smith',
        email: 'bob@example.com',
        password: 'Password123',
      },
      field: 'firstName',
      message: 'First name is required',
    },
    {
      scenario: 'surname is empty',
      payload: {
        firstName: 'Bob',
        surname: '',
        email: 'bob@example.com',
        password: 'Password123',
      },
      field: 'surname',
      message: 'Surname is required',
    },
    {
      scenario: 'password lacks a number',
      payload: {
        firstName: 'Bob',
        surname: 'Smith',
        email: 'bob@example.com',
        password: 'passwordonly',
      },
      field: 'password',
      message: 'Password must contain at least one letter and one number',
    },
    {
      scenario: 'password is too short',
      payload: {
        firstName: 'Bob',
        surname: 'Smith',
        email: 'bob@example.com',
        password: 'Pass1',
      },
      field: 'password',
      message: 'Password must be at least 8 characters',
    },
  ])('returns 400 when $scenario', async ({ payload, field, message }) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field, message }),
      ])
    );
  });

  it('returns 409 when registering with duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'First',
        surname: 'User',
        email: 'duplicate@example.com',
        password: 'Password123',
      });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Second',
        surname: 'User',
        email: 'duplicate@example.com',
        password: 'Password123',
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        message: 'Email is already taken',
        code: 'EMAIL_IN_USE',
      },
    });
  });

  it('returns 409 via database unique constraint when concurrent registration bypasses pre-check', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'First',
        surname: 'User',
        email: 'race@example.com',
        password: 'Password123',
      });

    const findUniqueSpy = vi.spyOn(prisma.users, 'findUnique').mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Second',
        surname: 'User',
        email: 'race@example.com',
        password: 'Password123',
      });

    findUniqueSpy.mockRestore();

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        message: 'Email is already taken',
        code: 'EMAIL_IN_USE',
      },
    });
  });
});



