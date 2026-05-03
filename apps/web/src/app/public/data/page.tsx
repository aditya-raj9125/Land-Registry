'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function VerifyPropertyPage() {
  const [ulpin, setUlpin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ulpin) return

    setIsVerifying(true)
    // Simulate blockchain verification delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setResult({
      ulpin: ulpin,
      status: 'VERIFIED',
      owner: 'Aditya Raj',
      area: '1,200 sq.ft',
      location: 'Pune, Maharashtra',
      onChainDate: '2024-05-12',
      transactionHash: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    })
    setIsVerifying(false)
  }

  return (
    <div className="min-h-screen bg-cream py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl font-bold text-ink mb-4">Public Property Verification</h1>
          <p className="text-ink-muted">Enter a 14-digit ULPIN (Bhu-Aadhaar) to verify ownership and encumbrance status directly from the blockchain.</p>
        </motion.div>

        <div className="card shadow-lg p-8">
          <form onSubmit={handleVerify} className="flex gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Enter 14-digit ULPIN (e.g. 14010100000001)"
                className="input"
                value={ulpin}
                onChange={(e) => setUlpin(e.target.value)}
                maxLength={14}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary px-8"
              disabled={isVerifying || ulpin.length < 14}
            >
              {isVerifying ? 'Verifying...' : 'Verify Now'}
            </button>
          </form>

          {isVerifying && (
            <div className="mt-12 text-center">
              <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-mono text-gold uppercase tracking-widest">Querying BhoomiChain Nodes...</p>
            </div>
          )}

          {result && !isVerifying && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-12 border-t border-border pt-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink">Verification Successful</h2>
                  <p className="text-xs font-mono text-ink-faint">ULPIN: {result.ulpin}</p>
                </div>
                <div className="badge badge-success px-4 py-2 text-sm font-bold">
                  AUTHENTIC TITLE
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Current Owner</p>
                  <p className="font-semibold text-ink">{result.owner}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Total Area</p>
                  <p className="font-semibold text-ink">{result.area}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Location</p>
                  <p className="font-semibold text-ink">{result.location}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Registered On</p>
                  <p className="font-semibold text-ink">{result.onChainDate}</p>
                </div>
              </div>

              <div className="bg-ink rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase mb-2">Blockchain Proof (Transaction Hash)</p>
                <p className="font-mono text-xs text-gold break-all">{result.transactionHash}</p>
              </div>

              <div className="mt-8 flex justify-center">
                <button className="btn btn-secondary btn-sm">Download Digital Certificate (PDF)</button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
          <div className="text-center">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-xs font-medium uppercase text-ink-muted">Encumbrance Free</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🛰️</div>
            <p className="text-xs font-medium uppercase text-ink-muted">GPS Verified</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚖️</div>
            <p className="text-xs font-medium uppercase text-ink-muted">Court Cleared</p>
          </div>
        </div>
      </div>
    </div>
  )
}
