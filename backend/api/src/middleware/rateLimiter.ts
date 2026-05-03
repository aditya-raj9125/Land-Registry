import type { Request, Response, NextFunction } from 'express'
import { redis } from '../lib/redis'

interface RateLimiterOptions {
  windowMs: number  // time window in ms
  max: number       // max requests per window
}

export function rateLimiter({ windowMs, max }: RateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${req.ip}:${req.path}`
    try {
      const current = await redis.incr(key)
      if (current === 1) {
        await redis.pexpire(key, windowMs)
      }
      if (current > max) {
        return res.status(429).json({
          error: 'Too many requests. Please slow down.',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil(windowMs / 1000),
        })
      }
      res.setHeader('X-RateLimit-Limit', max)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current))
      next()
    } catch {
      // If Redis fails, allow the request through
      next()
    }
  }
}
