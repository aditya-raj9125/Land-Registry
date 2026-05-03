import { Router } from 'express'
import { db } from '../lib/db'

export const transactionRouter = Router()

// Get all transactions for a user
transactionRouter.get('/', async (req: any, res) => {
  try {
    const { address } = req.query
    const result = await db.query(
      'SELECT * FROM transactions WHERE seller_address = $1 OR buyer_address = $1 ORDER BY created_at DESC',
      [address]
    )
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get single transaction details
transactionRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await db.query('SELECT * FROM transactions WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json(result.rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
