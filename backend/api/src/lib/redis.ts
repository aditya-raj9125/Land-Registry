import Redis from 'ioredis'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
})

redis.on('connect', () => console.log('✓ Redis connected'))
redis.on('error', (err) => console.error('[Redis Error]', err.message))
