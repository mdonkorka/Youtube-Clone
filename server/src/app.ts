import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { prisma } from './lib/prisma.js'

const app = express()

app.use(cors({
	origin: "http://localhost:5173",
	credentials: true,
}));
app.use(express.json())
app.use(cookieParser())

app.get('/health', async (_req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`
		res.json({ status: 'ok' })
	} catch {
		res.status(503).json({ status: 'error' })
	}
})

export default app
