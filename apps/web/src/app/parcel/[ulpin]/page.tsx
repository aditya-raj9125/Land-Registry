'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { use } from 'react'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const LAND_REGISTRY_ADDRESS = '0x2210414827e9df2b983a3fc1A201Bc4024eBb007' as const
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'XnAn-579FfLoGzhHc5-fO'

const client = createPublicClient({
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`),
})

const ABI = [
  {
    inputs: [{ internalType: 'string', name: 'ulpin', type: 'string' }],
    name: 'getTokenByUlpin',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getLandDetails',
    outputs: [{
      components: [
        { internalType: 'string', name: 'ulpin', type: 'string' },
        { internalType: 'string', name: 'ipfsDocHash', type: 'string' },
        { internalType: 'bytes32', name: 'sha256DocHash', type: 'bytes32' },
        { internalType: 'uint8', name: 'landType', type: 'uint8' },
        { internalType: 'uint256', name: 'areaInSqm', type: 'uint256' },
        { internalType: 'string', name: 'districtCode', type: 'string' },
        { internalType: 'string', name: 'stateCode', type: 'string' },
        { internalType: 'bool', name: 'hasEncumbrance', type: 'bool' },
        { internalType: 'bool', name: 'isFrozen', type: 'bool' },
        { internalType: 'uint8', name: 'titleStatus', type: 'uint8' },
        { internalType: 'uint256', name: 'askingPrice', type: 'uint256' },
        { internalType: 'uint256', name: 'mintedAt', type: 'uint256' },
        { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      ],
      internalType: 'struct LandRegistry.ParcelMetadata',
      name: '',
      type: 'tuple',
    }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getOwnerHistory',
    outputs: [{
      components: [
        { internalType: 'address', name: 'owner', type: 'address' },
        { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        { internalType: 'bytes32', name: 'transactionHash', type: 'bytes32' },
      ],
      internalType: 'struct LandRegistry.OwnerRecord[]',
      name: '',
      type: 'tuple[]',
    }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const LAND_TYPES = ['Agricultural', 'Residential', 'Commercial', 'Industrial', 'Forest']
const TITLE_STATUSES = ['Active', 'UnderDispute', 'Mortgaged', 'ForSale', 'Transferred']

function shortAddr(addr: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
}

function EncumbranceRow({ label, clear }: { label: string; clear: boolean }) {
  return (
    <tr>
      <td className="py-3 px-4 text-sm text-[var(--color-ink-muted)]">{label}</td>
      <td className="py-3 px-4">
        {clear
          ? <span className="text-[var(--color-success)] text-sm font-medium">✓ Clear</span>
          : <span className="text-[var(--color-danger)] text-sm font-medium">⚠ Flagged</span>}
      </td>
    </tr>
  )
}

export default function ParcelDetailPage({ params }: { params: Promise<{ ulpin: string }> }) {
  const { ulpin } = use(params)
  const [offerModal, setOfferModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parcel, setParcel] = useState<any>(null)

  useEffect(() => {
    async function fetchParcel() {
      setLoading(true)
      setError(null)
      try {
        // Step 1: ULPIN → tokenId
        const tokenId = await client.readContract({
          address: LAND_REGISTRY_ADDRESS,
          abi: ABI,
          functionName: 'getTokenByUlpin',
          args: [ulpin],
        }) as bigint

        if (!tokenId || tokenId === 0n) {
          setError('This ULPIN is not registered on BhoomiChain.')
          setLoading(false)
          return
        }

        // Step 2: Parallel fetch
        const [details, owner, ownerHistory] = await Promise.all([
          client.readContract({ address: LAND_REGISTRY_ADDRESS, abi: ABI, functionName: 'getLandDetails', args: [tokenId] }),
          client.readContract({ address: LAND_REGISTRY_ADDRESS, abi: ABI, functionName: 'ownerOf', args: [tokenId] }),
          client.readContract({ address: LAND_REGISTRY_ADDRESS, abi: ABI, functionName: 'getOwnerHistory', args: [tokenId] }),
        ]) as [any, string, any[]]

        const mintedMs = Number(details.mintedAt) * 1000
        const mintedDate = mintedMs ? new Date(mintedMs).toLocaleDateString('en-IN') : 'N/A'
        const titleStatus = TITLE_STATUSES[details.titleStatus] ?? 'Active'
        const isClear = !details.hasEncumbrance && !details.isFrozen && details.titleStatus === 0

        setParcel({
          tokenId: tokenId.toString(),
          ulpin: details.ulpin,
          ownerAddress: owner,
          areaInSqm: details.areaInSqm.toString(),
          districtCode: details.districtCode,
          stateCode: details.stateCode,
          landType: LAND_TYPES[details.landType] ?? `Type ${details.landType}`,
          titleStatus,
          isClear,
          hasEncumbrance: details.hasEncumbrance,
          isFrozen: details.isFrozen,
          ipfsDocHash: details.ipfsDocHash,
          mintedAt: mintedDate,
          askingPriceWei: details.askingPrice.toString(),
          ownerHistory: Array.isArray(ownerHistory) ? ownerHistory : [],
        })
      } catch (err: any) {
        console.error(err)
        setError('Failed to load parcel data. The ULPIN may not exist on-chain.')
      } finally {
        setLoading(false)
      }
    }
    fetchParcel()
  }, [ulpin])

  // --- Loading State ---
  if (loading) return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center flex-col gap-4">
      <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      <p className="font-mono text-sm text-[var(--color-gold)] uppercase tracking-widest">Querying Sepolia Blockchain...</p>
      <p className="text-xs text-[var(--color-ink-faint)]">Reading ULPIN: {ulpin}</p>
    </div>
  )

  // --- Error / Not Found State ---
  if (error || !parcel) return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center flex-col gap-4 text-center px-6">
      <div className="text-6xl">🔍</div>
      <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">Parcel Not Found</h1>
      <p className="text-[var(--color-ink-muted)]">{error || 'This ULPIN has no on-chain record.'}</p>
      <p className="font-mono text-xs text-[var(--color-ink-faint)]">ULPIN: {ulpin}</p>
      <Link href="/search" className="btn btn-primary mt-2">← Back to Search</Link>
    </div>
  )

  const statusBanner = parcel.isFrozen
    ? { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', label: '🔒 Frozen — Cannot be Transacted' }
    : parcel.hasEncumbrance
    ? { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', label: '⚠ Encumbered — Mortgage or Lien Active' }
    : { color: 'var(--color-success)', bg: 'var(--color-success-light)', label: '✓ Title Clear — Safe to Transact' }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">

      {/* Sticky Nav */}
      <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3 px-6 flex items-center gap-4 sticky top-0 z-30">
        <Link href="/" className="text-[var(--color-gold)] font-display font-bold text-lg">BhoomiChain</Link>
        <span className="text-[var(--color-ink-faint)]">/</span>
        <Link href="/search" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)]">Search</Link>
        <span className="text-[var(--color-ink-faint)]">/</span>
        <span className="font-mono text-sm text-[var(--color-ink)]">{parcel.ulpin}</span>
        <span className="ml-auto text-xs font-mono text-[var(--color-ink-faint)]">Live • Sepolia</span>
      </nav>

      {/* Hero */}
      <div className="relative h-80 bg-gradient-to-br from-green-800 via-green-600 to-yellow-600 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-9xl">🛰️</div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points="20,20 80,15 85,70 15,75" fill="none" stroke="var(--color-gold)" strokeWidth="0.5" strokeDasharray="2,1" />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="font-mono text-white/60 text-xs mb-1">ULPIN: {parcel.ulpin} • Token #{parcel.tokenId}</div>
          <h1 className="font-display text-3xl text-white font-bold">{parcel.areaInSqm} m²</h1>
          <p className="text-white/80 mt-1">📍 {parcel.districtCode}, {parcel.stateCode} • {parcel.landType}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className="py-3 px-6 text-center font-medium text-sm" style={{ backgroundColor: statusBanner.bg, color: statusBanner.color }}>
        {statusBanner.label}
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-10 flex gap-8 items-start">

        {/* Left Column */}
        <div className="flex-1 space-y-8">

          {/* Current Ownership */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Current Ownership</h2>
            <div className="flex items-center gap-4 p-4 bg-[var(--color-cream)] rounded-lg">
              <div className="w-12 h-12 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-white font-bold text-lg font-display">
                {parcel.ownerAddress.slice(2, 3).toUpperCase()}
              </div>
              <div>
                <div className="font-mono text-sm text-[var(--color-ink)]">{parcel.ownerAddress}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-[var(--color-ink-faint)]">Token #{parcel.tokenId}</span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-[var(--color-ink-faint)]">Minted On</div>
                <div className="font-medium text-[var(--color-ink)]">{parcel.mintedAt}</div>
              </div>
            </div>

            {parcel.ownerHistory.length > 0 && (
              <>
                <h3 className="font-display text-base font-semibold mt-6 mb-4 text-[var(--color-ink-muted)]">Ownership History</h3>
                <div className="relative pl-6">
                  {parcel.ownerHistory.map((h: any, i: number) => {
                    const ts = Number(h.timestamp) * 1000
                    const dateStr = ts ? new Date(ts).toLocaleDateString('en-IN') : 'N/A'
                    return (
                      <div key={i} className="relative pb-5 last:pb-0">
                        <div className="absolute left-[-1.5rem] w-3 h-3 rounded-full bg-[var(--color-gold)] border-2 border-[var(--color-surface)] top-1" />
                        {i < parcel.ownerHistory.length - 1 && (
                          <div className="absolute left-[-1.25rem] w-0.5 h-full bg-[var(--color-border)] top-4" />
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs text-[var(--color-ink)]">{shortAddr(h.owner)}</span>
                          <span className="badge badge-success text-xs">On-Chain</span>
                          <a href={`https://sepolia.etherscan.io/address/${h.owner}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-[var(--color-gold)] hover:underline">View ↗</a>
                          <span className="text-xs text-[var(--color-ink-faint)] ml-auto">{dateStr}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* Documents (from IPFS hash) */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Legal Documents</h2>
            {parcel.ipfsDocHash ? (
              <div className="flex items-center gap-3 p-3 bg-[var(--color-cream)] rounded-lg">
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-[var(--color-ink)]">Title Registration Document</div>
                  <div className="font-mono text-xs text-[var(--color-ink-faint)] mt-0.5 break-all">{parcel.ipfsDocHash}</div>
                </div>
                <a href={`https://ipfs.io/ipfs/${parcel.ipfsDocHash}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  View on IPFS
                </a>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">No document hash recorded on-chain.</p>
            )}
          </section>

          {/* Encumbrance */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Encumbrance Certificate</h2>
            <table className="data-table">
              <tbody>
                <EncumbranceRow label="Mortgage / Bank Loan" clear={!parcel.hasEncumbrance} />
                <EncumbranceRow label="Parcel Frozen by Authority" clear={!parcel.isFrozen} />
                <EncumbranceRow label="Title Status Normal" clear={parcel.titleStatus === 'Active'} />
              </tbody>
            </table>
          </section>

          {/* On-Chain Info */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Blockchain Record</h2>
            <table className="data-table">
              <tbody>
                {[
                  ['Contract', LAND_REGISTRY_ADDRESS],
                  ['Token ID', `#${parcel.tokenId}`],
                  ['Network', 'Sepolia Testnet'],
                  ['Minted On', parcel.mintedAt],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-3 px-4 text-sm text-[var(--color-ink-muted)] w-36">{k}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[var(--color-ink)] break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <a href={`https://sepolia.etherscan.io/token/${LAND_REGISTRY_ADDRESS}?a=${parcel.tokenId}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary btn-sm">
                View on Etherscan ↗
              </a>
            </div>
          </section>
        </div>

        {/* Right Sticky Column */}
        <div className="w-80 shrink-0 sticky top-20 space-y-5">

          {/* Attributes Card */}
          <div className="card">
            <h3 className="font-display text-base font-semibold mb-4">Parcel Attributes</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Type', parcel.landType],
                ['Area', `${parcel.areaInSqm} m²`],
                ['District', parcel.districtCode],
                ['State', parcel.stateCode],
                ['Title Status', parcel.titleStatus],
                ['Encumbrance', parcel.hasEncumbrance ? '⚠ Yes' : '✓ None'],
                ['Frozen', parcel.isFrozen ? '🔒 Yes' : '✓ No'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">{k}</span>
                  <span className="font-medium text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Card */}
          {parcel.isClear && (
            <div className="card border-[var(--color-gold)]">
              <div className="font-display text-sm font-semibold text-[var(--color-gold)] mb-4">Interested in this parcel?</div>
              <button className="btn btn-primary w-full mb-3" onClick={() => setOfferModal(true)}>
                Make an Offer
              </button>
              <button className="btn btn-secondary w-full">+ Add to Watchlist</button>
            </div>
          )}

          {/* Owner Address */}
          <div className="card">
            <h3 className="font-display text-sm font-semibold mb-3">Current Owner</h3>
            <div className="font-mono text-xs text-[var(--color-ink)] break-all bg-[var(--color-cream)] p-3 rounded-lg">
              {parcel.ownerAddress}
            </div>
            <a href={`https://sepolia.etherscan.io/address/${parcel.ownerAddress}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[var(--color-gold)] hover:underline mt-2 block">
              View on Etherscan ↗
            </a>
          </div>

          {/* Share */}
          <div className="card">
            <h3 className="font-display text-sm font-semibold mb-3">Share & Report</h3>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm flex-1 text-xs">📋 Copy Link</button>
              <button className="btn btn-ghost btn-sm flex-1 text-xs">📱 WhatsApp</button>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <Link href="/grievance" className="text-xs text-[var(--color-danger)] hover:underline">
                ⚠ Report a problem with this property
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card max-w-md w-full">
            <h2 className="font-display text-2xl font-bold mb-2">Make an Offer</h2>
            <p className="text-[var(--color-ink-muted)] text-sm mb-6">
              ULPIN: <span className="font-mono">{parcel.ulpin}</span>
            </p>
            <div className="mb-4">
              <label className="label">Your Offer (₹)</label>
              <input type="number" className="input" placeholder="e.g. 3000000" />
            </div>
            <div className="mb-6">
              <label className="label">Cover Letter (Optional)</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="Introduce yourself to the seller..." />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary flex-1" onClick={() => setOfferModal(false)}>Send Offer</button>
              <button className="btn btn-ghost flex-1" onClick={() => setOfferModal(false)}>Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
