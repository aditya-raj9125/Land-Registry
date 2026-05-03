import { Router } from 'express'
import { db } from '../lib/db'

export const bankRouter = Router()

// Get mortgages for a specific bank or property
bankRouter.get('/mortgages', async (req, res) => {
  try {
    const { tokenId } = req.query
    let query = 'SELECT * FROM mortgages'
    const params = []
    
    if (tokenId) {
      query += ' WHERE token_id = $1'
      params.push(tokenId)
    }
    
    const result = await db.query(query, params)
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
