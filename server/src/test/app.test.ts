import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

describe('GET /health', () => {
	it('responds 200 and confirms the test DB is reachable', async () => {
		const response = await request(app).get('/health')

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ status: 'ok' })
	})
})

describe('Global error handling', () => {
	it('returns 400 with BAD_REQUEST on malformed JSON payload', async () => {
		const response = await request(app)
			.post('/api/auth/register')
			.set('Content-Type', 'application/json')
			.send('{"bad":')

		expect(response.status).toBe(400)
		expect(response.body).toEqual({
			error: {
				message: 'Invalid JSON payload',
				code: 'BAD_REQUEST',
			},
		})
	})
})
