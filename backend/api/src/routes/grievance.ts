import { Router } from 'express'
import { db } from '../lib/db'

export const grievanceRouter = Router()

// File a new grievance
grievanceRouter.post('/', async (req, res) => {
  try {
    const { tokenId, complainant, details, district } = req.body
    const complaintId = `GRV-${Date.now()}`
    
    const result = await db.query(
      `INSERT INTO grievances (complaint_id, token_id, complainant, details, district, status)
       VALUES ($1, $2, $3, $4, $5, 'FILED') RETURNING *`,
      [complaintId, tokenId, complainant, details, district]
    )
    
    res.json(result.rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get grievances for a user
grievanceRouter.get('/', async (req: any, res) => {
  try {
    const { address } = req.query
    const result = await db.query(
      'SELECT * FROM grievances WHERE complainant = $1 ORDER BY created_at DESC',
      [address]
    )
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
