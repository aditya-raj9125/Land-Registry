import type { Request, Response, NextFunction } from 'express'
import { ethers } from 'ethers'
import { redis } from '../lib/redis'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' })
  }

  // Support two auth methods:
  // 1. Wallet signature: "Bearer <address>:<signature>:<message>"
  // 2. Session token: "Bearer <session-token>"
  const token = authHeader.replace('Bearer ', '')

  try {
    // Check session cache first
    const cached = await redis.get(`session:${token}`)
    if (cached) {
      req.user = JSON.parse(cached)
      return next()
    }

    if (token.includes(':')) {
      // Wallet signature auth
      const [address, signature, message] = token.split(':')
      const recovered = ethers.verifyMessage(message, signature)
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ error: 'Invalid wallet signature', code: 'INVALID_SIGNATURE' })
      }
      const user = { address, type: 'wallet' }
      await redis.setex(`session:${token}`, 3600, JSON.stringify(user)) // 1 hour
      req.user = user
    } else {
      // Session token (from Aadhaar OTP login)
      return res.status(401).json({ error: 'Invalid session', code: 'INVALID_SESSION' })
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' })
  }
}

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      user?: { address: string; type: string; role?: string }
    }
  }
}
