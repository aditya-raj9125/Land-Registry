import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import { parcelRouter } from './routes/parcel'
import { transactionRouter } from './routes/transaction'
import { uploadRouter } from './routes/upload'
import { analyticsRouter } from './routes/analytics'
import { bankRouter } from './routes/bank'
import { grievanceRouter } from './routes/grievance'
import { rateLimiter } from './middleware/rateLimiter'
import { authMiddleware } from './middleware/auth'
import path from 'path'

const envPath = path.resolve(__dirname, '../../../../.env')
dotenv.config({ path: envPath })

// Fallback if the above fails (sometimes happens in certain environments)
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
}

console.log('────────────────────────────────────────────────')
console.log('🚀 BHOOMICHAIN API STARTUP')
console.log(`📂 CWD: ${process.cwd()}`)
console.log(`📂 DB_URL: ${process.env.DATABASE_URL ? 'DB_URL_LOADED' : 'DB_URL_MISSING'}`)
console.log('────────────────────────────────────────────────')

const app = express()
const PORT = process.env.API_PORT || 4000

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://bhoomichain.in',
    'https://gov.bhoomichain.in',
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting: 100 req/min public, 1000 authenticated
app.use('/api/', rateLimiter({ windowMs: 60_000, max: 100 }))
app.use('/api/gov/', rateLimiter({ windowMs: 60_000, max: 1000 }))

// ── Health Check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'BhoomiChain API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// ── Public Routes ───────────────────────────────────────────
app.use('/api/parcels', parcelRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/grievances', grievanceRouter)

// ── Protected Routes (wallet signature or Aadhaar OTP) ─────
app.use('/api/transactions', authMiddleware, transactionRouter)
app.use('/api/gov', authMiddleware, uploadRouter)
app.use('/api/bank', authMiddleware, bankRouter)

// ── Error Handler ───────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message)
  res.status(500).json({
    error: 'Something went wrong. Please try again or contact support.',
    code: 'INTERNAL_ERROR',
  })
})

app.listen(PORT, () => {
  console.log(`✓ BhoomiChain API running on http://localhost:${PORT}`)
})

export default app
