import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

// Fallback if needed
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
})

db.on('error', (err) => {
  console.error('[DB Pool Error]', err.message)
})

export async function initDb() {
  const client = await db.connect()
  try {
    await client.query('SELECT NOW()')
    console.log('✓ PostgreSQL connected')
  } finally {
    client.release()
  }
}
