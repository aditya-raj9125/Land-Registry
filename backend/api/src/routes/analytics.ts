import { Router } from 'express'
import { db } from '../lib/db'

export const analyticsRouter = Router()

// Get platform-wide statistics
analyticsRouter.get('/stats', async (_req, res) => {
  try {
    const parcelCount = await db.query('SELECT COUNT(*) FROM parcels')
    const txCount = await db.query('SELECT COUNT(*) FROM transactions')
    const disputeCount = await db.query('SELECT COUNT(*) FROM disputes')
    
    res.json({
      totalParcels: parseInt(parcelCount.rows[0].count),
      totalTransactions: parseInt(txCount.rows[0].count),
      openDisputes: parseInt(disputeCount.rows[0].count),
      network: 'Sepolia'
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
