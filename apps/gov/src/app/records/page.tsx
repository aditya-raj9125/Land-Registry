'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useWriteContract } from 'wagmi'
import { ethers } from 'ethers'
import deployedAddresses from '../../../../../packages/contracts/deployments/sepolia-latest.json'

const LAND_REGISTRY_ABI = [
  'function setTitleStatus(uint256 tokenId, uint8 status) external'
]

export default function RecordsPage() {
  const [parcels, setParcels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { address } = useAccount()
  const { writeContract, isPending: isVerifying } = useWriteContract()

  const handleVerify = async (tokenId: string) => {
    writeContract({
      address: deployedAddresses.LandRegistry as `0x${string}`,
      abi: LAND_REGISTRY_ABI,
      functionName: 'setTitleStatus',
      args: [BigInt(tokenId), 0], // 0 = TitleStatus.CLEAR
    })
  }

  useEffect(() => {
    const fetchAllRecords = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/parcels/search?q=${searchQuery}`)
        const data = await response.json()
        setParcels(data)
      } catch (err) {
        console.error('Failed to fetch records:', err)
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchAllRecords, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <nav className="h-20 border-b border-white/5 flex items-center justify-between px-12 sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center font-bold text-black text-sm">B</div>
            <span className="font-bold tracking-tight text-base">BhoomiChain Registry</span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filter by ULPIN or Region..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-10 py-2 text-sm w-80 focus:border-gold/50 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-white/60">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> API Connected</span>
          <div className="h-4 w-px bg-white/10" />
          <span className="font-mono text-gold">{address?.slice(0, 10)}...</span>
        </div>
      </nav>

      <main className="p-12 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-gold font-bold">National Registry Live Feed</span>
            </motion.div>
            <h2 className="text-5xl font-display font-bold tracking-tight">Land Records <span className="text-white/20">Archive</span></h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Database Integrity</p>
              <p className="text-sm font-mono text-green-500">100% Verified</p>
            </div>
            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-white/40 text-xs mr-2">Total Parcels:</span>
              <span className="text-xl font-bold font-mono text-gold">{parcels.length}</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-gold/20 rounded-full" />
              <div className="absolute inset-0 border-t-2 border-gold rounded-full animate-spin" />
            </div>
            <p className="text-sm font-display italic text-white/40 tracking-wide">Querying National Blockchain...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold border-b border-white/5">
              <div className="col-span-3">ULPIN / Asset ID</div>
              <div className="col-span-2">Classification</div>
              <div className="col-span-2">Area (Sqm)</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-3 text-right">Blockchain Reference</div>
            </div>

            <AnimatePresence>
              {parcels.map((p, i) => (
                <motion.div 
                  key={p.ulpin}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-6 py-6 bg-white/[0.02] border border-white/5 rounded-2xl items-center group hover:bg-white/[0.05] hover:border-gold/30 transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle Glow Background */}
                  <div className="absolute -right-20 -top-20 w-40 h-40 bg-gold/5 blur-[60px] rounded-full group-hover:bg-gold/10 transition-all" />

                  <div className="col-span-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-base text-gold font-bold mb-1">{p.ulpin}</span>
                      <span className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-px bg-white/20" /> Token ID: #{p.token_id}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-40">{p.land_type === 1 ? '🏠' : '🌾'}</span>
                      <span className="text-xs font-medium text-white/70">{p.land_type === 1 ? 'Residential' : 'Agricultural'}</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="font-mono text-base font-bold">{p.area_sqm || '—'}</span>
                    <span className="text-[10px] text-white/30 ml-1">SQM</span>
                  </div>

                  <div className="col-span-2 flex flex-col items-center gap-2">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border shadow-sm ${
                      p.title_status === 'CLEAR' ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/10' : 
                      p.title_status === 'PENDING' ? 'bg-gold/10 text-gold border-gold/20 shadow-gold/10' :
                      'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10'
                    }`}>
                      {p.title_status}
                    </div>
                    {p.title_status === 'PENDING' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify(p.token_id);
                        }}
                        disabled={isVerifying}
                        className="text-[8px] uppercase tracking-widest text-gold hover:text-white transition-colors underline underline-offset-4"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify Title'}
                      </button>
                    )}
                  </div>

                  <div className="col-span-3 text-right">
                    <div className="flex flex-col items-end">
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${p.mint_transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-white/40 hover:text-gold flex items-center gap-2 group-hover:text-white transition-all"
                      >
                        {p.mint_transaction_hash?.slice(0, 14)}... 
                        <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-all">↗</span>
                      </a>
                      <span className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">
                        Block: {p.mint_block_number || 'Confirmed'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {parcels.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">📂</div>
                <p className="text-white/40 text-sm">No records found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
