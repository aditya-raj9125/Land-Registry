import { Router } from 'express'
import multer from 'multer'

export const uploadRouter = Router()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB limit

// Upload a document to IPFS (placeholder)
uploadRouter.post('/ipfs', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    
    // In a real app, you would upload to web3.storage or Pinata here
    res.json({
      success: true,
      hash: 'QmPlaceholderHash123456789',
      name: req.file.originalname,
      size: req.file.size
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
