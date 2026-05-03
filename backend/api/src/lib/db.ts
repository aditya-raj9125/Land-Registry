import { Pool } from 'pg'

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
