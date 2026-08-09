import dotenv from 'dotenv'
dotenv.config()

import app from './app.js'
import { prisma } from './lib/prisma.js'

const PORT = 8000

await prisma.$connect()
console.log('Database connected')

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
});