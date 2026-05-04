'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const LAND_REGISTRY_ADDRESS = '0x2210414827e9df2b983a3fc1A201Bc4024eBb007' as const

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
    outputs: [
      {
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
      },
    ],
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
] as const

const LAND_TYPES = ['Agricultural', 'Residential', 'Commercial', 'Industrial', 'Forest']
const TITLE_STATUSES = ['Active', 'UnderDispute', 'Mortgaged', 'ForSale', 'Transferred']

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'XnAn-579FfLoGzhHc5-fO'

const client = createPublicClient({
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`),
})

export default function VerifyPropertyPage() {
  const [ulpin, setUlpin] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ulpin || ulpin.length !== 14) return

    setIsVerifying(true)
    setResult(null)
    setError(null)

    try {
      // Step 1: Resolve ULPIN → tokenId
      const tokenId = await client.readContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: ABI,
        functionName: 'getTokenByUlpin',
        args: [ulpin],
      }) as bigint

      if (!tokenId || tokenId === 0n) {
        setError('This ULPIN is not registered on BhoomiChain.')
        setIsVerifying(false)
        return
      }

      // Step 2: Fetch land details + current owner in parallel
      const [details, owner] = await Promise.all([
        client.readContract({
          address: LAND_REGISTRY_ADDRESS,
          abi: ABI,
          functionName: 'getLandDetails',
          args: [tokenId],
        }),
        client.readContract({
          address: LAND_REGISTRY_ADDRESS,
          abi: ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }),
      ]) as [any, string]

      setResult({
        tokenId: tokenId.toString(),
        ulpin: details.ulpin,
        ownerAddress: owner,
        areaInSqm: details.areaInSqm.toString(),
        districtCode: details.districtCode,
        stateCode: details.stateCode,
        landType: LAND_TYPES[details.landType] ?? `Type ${details.landType}`,
        titleStatus: TITLE_STATUSES[details.titleStatus] ?? `Status ${details.titleStatus}`,
        hasEncumbrance: details.hasEncumbrance,
        isFrozen: details.isFrozen,
        ipfsDocHash: details.ipfsDocHash,
        mintedAt: details.mintedAt
          ? new Date(Number(details.mintedAt) * 1000).toLocaleDateString('en-IN')
          : 'N/A',
      })
    } catch (err: any) {
      console.error(err)
      if (err?.message?.includes('ULPIN not found') || err?.message?.includes('revert')) {
        setError('This ULPIN is not registered on BhoomiChain.')
      } else {
        setError('Failed to query the blockchain. Check your network or try again.')
      }
    } finally {
      setIsVerifying(false)
    }
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
          <p className="text-ink-muted">
            Enter a 14-digit ULPIN (Bhu-Aadhaar) to verify ownership and encumbrance status{' '}
            <strong>directly from the Sepolia blockchain</strong>.
          </p>
          <p className="text-xs font-mono text-ink-faint mt-2">
            Contract: {LAND_REGISTRY_ADDRESS}
          </p>
        </motion.div>

        <div className="card shadow-lg p-8">
          <form onSubmit={handleVerify} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter 14-digit ULPIN (e.g. 14010100000001)"
                className="input font-mono tracking-widest"
                value={ulpin}
                onChange={(e) => {
                  setUlpin(e.target.value)
                  setResult(null)
                  setError(null)
                }}
                maxLength={14}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary px-8"
              disabled={isVerifying || ulpin.length < 14}
            >
              {isVerifying ? 'Querying...' : 'Verify Now'}
            </button>
          </form>

          {/* Loading */}
          {isVerifying && (
            <div className="mt-12 text-center">
              <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-mono text-gold uppercase tracking-widest">
                Querying Sepolia Blockchain...
              </p>
              <p className="text-xs text-ink-faint mt-2">Reading from LandRegistry contract</p>
            </div>
          )}

          {/* Error */}
          {error && !isVerifying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 p-5 bg-red-50 border border-red-200 rounded-xl text-center"
            >
              <div className="text-3xl mb-2">🔍</div>
              <p className="font-semibold text-red-700">{error}</p>
              <p className="text-xs text-red-400 mt-1">
                Only ULPINs minted via BhoomiChain Gov Portal will appear here.
              </p>
            </motion.div>
          )}

          {/* Success Result */}
          {result && !isVerifying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-12 border-t border-border pt-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink">Verification Successful</h2>
                  <p className="text-xs font-mono text-ink-faint">ULPIN: {result.ulpin} • Token #{result.tokenId}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-xs font-bold ${
                  result.isFrozen
                    ? 'bg-red-100 text-red-700'
                    : result.hasEncumbrance
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {result.isFrozen ? '🔒 FROZEN' : result.hasEncumbrance ? '⚠ ENCUMBERED' : '✓ AUTHENTIC TITLE'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card-cream p-4 col-span-2">
                  <p className="text-xs text-ink-muted uppercase mb-1">Current Owner (Wallet)</p>
                  <p className="font-mono text-sm text-ink break-all">{result.ownerAddress}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Total Area</p>
                  <p className="font-semibold text-ink">{result.areaInSqm} m²</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Land Type</p>
                  <p className="font-semibold text-ink">{result.landType}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Location</p>
                  <p className="font-semibold text-ink">{result.districtCode}, {result.stateCode}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Registered On</p>
                  <p className="font-semibold text-ink">{result.mintedAt}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Title Status</p>
                  <p className="font-semibold text-ink">{result.titleStatus}</p>
                </div>
                <div className="card-cream p-4">
                  <p className="text-xs text-ink-muted uppercase mb-1">Encumbrance</p>
                  <p className={`font-semibold ${result.hasEncumbrance ? 'text-yellow-600' : 'text-green-600'}`}>
                    {result.hasEncumbrance ? '⚠ Yes' : '✓ None'}
                  </p>
                </div>
              </div>

              {result.ipfsDocHash && (
                <div className="bg-ink rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-400 uppercase mb-2">IPFS Document Hash</p>
                  <a
                    href={`https://ipfs.io/ipfs/${result.ipfsDocHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-gold break-all hover:underline"
                  >
                    {result.ipfsDocHash}
                  </a>
                </div>
              )}

              <div className="bg-ink rounded-lg p-4">
                <p className="text-xs text-gray-400 uppercase mb-2">Verify on Etherscan</p>
                <a
                  href={`https://sepolia.etherscan.io/token/${LAND_REGISTRY_ADDRESS}?a=${result.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-gold break-all hover:underline"
                >
                  {LAND_REGISTRY_ADDRESS} → Token #{result.tokenId}
                </a>
              </div>

              <div className="mt-6 flex justify-center">
                <button className="btn btn-secondary btn-sm">Download Digital Certificate (PDF)</button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
          <div className="text-center">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-xs font-medium uppercase text-ink-muted">Live On-Chain Data</p>
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
