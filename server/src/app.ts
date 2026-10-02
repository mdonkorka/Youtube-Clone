import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { prisma } from './lib/prisma.js'
import authRoutes from './modules/auth/auth.routes.js'
import { errorHandler } from './middlewares/error.js'

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express()

app.use(cors({
	origin: "http://localhost:5173",
	credentials: true,
}));
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)

app.get('/health', async (_req, res) => {
	try {
		await prisma.$queryRaw`SELECT 1`
		res.json({ status: 'ok' })
	} catch {
		res.status(503).json({ status: 'error' })
	}
})

app.use(errorHandler)

export default app

