import { Router } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { redis } from '../lib/redis'

export const parcelRouter = Router()

// GET /api/parcels/:ulpin — fetch single parcel
parcelRouter.get('/:ulpin', async (req, res) => {
  const { ulpin } = req.params
  try {
    // Check Redis cache first (30s TTL)
    const cached = await redis.get(`parcel:${ulpin}`)
    if (cached) {
      return res.json(JSON.parse(cached))
    }

    const result = await db.query(
      `SELECT p.*, 
        ST_AsGeoJSON(p.coordinates)::json AS coordinates_geojson
       FROM parcels p 
       WHERE p.ulpin = $1`,
      [ulpin]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parcel not found', code: 'NOT_FOUND' })
    }

    const parcel = result.rows[0]
    await redis.setex(`parcel:${ulpin}`, 30, JSON.stringify(parcel))
    return res.json(parcel)
  } catch (err) {
    console.error('[parcel/:ulpin]', err)
    return res.status(500).json({ error: 'Failed to fetch parcel', code: 'DB_ERROR' })
  }
})

// GET /api/parcels/search — full-text search via Meilisearch
parcelRouter.get('/search', async (req, res) => {
  const { q, type, status, district, minArea, maxArea, page = '1' } = req.query as Record<string, string>
  try {
    // In production: call Meilisearch
    // const results = await meilisearch.index('parcels').search(q, { filter, limit: 20, offset })
    
    // Mock response
    return res.json({
      hits: [],
      total: 0,
      page: parseInt(page),
      query: q,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' })
  }
})

// GET /api/parcels/:ulpin/verify — on-chain verification
parcelRouter.get('/:ulpin/verify', async (req, res) => {
  const { ulpin } = req.params
  try {
    const result = await db.query(
      'SELECT token_id, title_status, mint_transaction_hash, mint_block_number FROM parcels WHERE ulpin = $1',
      [ulpin]
    )
    if (result.rows.length === 0) {
      return res.json({ verified: false, message: 'ULPIN not found in registry' })
    }
    const p = result.rows[0]
    return res.json({
      verified: true,
      tokenId: p.token_id,
      titleStatus: p.title_status,
      mintTx: p.mint_transaction_hash,
      mintBlock: p.mint_block_number,
      etherscanUrl: `https://sepolia.etherscan.io/token/${process.env.LAND_REGISTRY_ADDRESS}?a=${p.token_id}`,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed', code: 'VERIFY_ERROR' })
  }
})

// GET /api/parcels — list parcels (paginated)
parcelRouter.get('/', async (req, res) => {
  const { page = '1', limit = '20', district, land_type, status } = req.query as Record<string, string>
  const offset = (parseInt(page) - 1) * parseInt(limit)

  try {
    let query = 'SELECT * FROM parcels WHERE 1=1'
    const params: (string | number)[] = []

    if (district) { params.push(district); query += ` AND district = $${params.length}` }
    if (land_type) { params.push(land_type); query += ` AND land_type = $${params.length}` }
    if (status) { params.push(status); query += ` AND title_status = $${params.length}` }

    params.push(parseInt(limit)); query += ` LIMIT $${params.length}`
    params.push(offset); query += ` OFFSET $${params.length}`

    const result = await db.query(query, params)
    const countResult = await db.query('SELECT COUNT(*) FROM parcels', [])

    return res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch parcels', code: 'DB_ERROR' })
  }
})
