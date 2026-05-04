'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ethers } from 'ethers'
import deployedAddresses from '../../../../../packages/contracts/deployments/sepolia-latest.json'

const STEPS = [
  { num: 1, label: 'Parcel ID', icon: '🆔' },
  { num: 2, label: 'Boundary Map', icon: '🗺️' },
  { num: 3, label: 'Ownership', icon: '👤' },
  { num: 4, label: 'Title Chain', icon: '📜' },
  { num: 5, label: 'Encumbrance', icon: '🔒' },
  { num: 6, label: 'Classification', icon: '🌾' },
  { num: 7, label: 'Review & Mint', icon: '⛓️' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center flex-1 last:flex-none">
          <div className={`step-dot text-xs ${s.num < current ? 'completed' : s.num === current ? 'active' : 'pending'}`}>
            {s.num < current ? '✓' : s.num}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`step-line ${s.num < current ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// Step 1: Parcel Identification
function Step1({ onNext, updateForm }: { onNext: () => void; updateForm: (u: any) => void }) {
  const [ulpin, setUlpin] = useState('')
  const [found, setFound] = useState<null | 'found' | 'new'>(null)
  const [checking, setChecking] = useState(false)

  const checkUlpin = () => {
    if (ulpin.length !== 14) return
    setChecking(true)
    setTimeout(() => {
      setFound(ulpin.startsWith('14') ? 'found' : 'new')
      setChecking(false)
      updateForm({ ulpin })
    }, 800)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Parcel Identification</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">Enter the 14-digit ULPIN (Bhu-Aadhaar). The system will check DILRMP for existing records.</p>

      <div>
        <label className="label">ULPIN (14-digit Bhu-Aadhaar) *</label>
        <div className="flex gap-3">
          <input
            className="input font-mono text-lg tracking-widest flex-1"
            maxLength={14}
            placeholder="00000000000000"
            value={ulpin}
            onChange={(e) => { 
              const val = e.target.value.replace(/\D/g, '')
              setUlpin(val)
              setFound(null)
              updateForm({ ulpin: val })
            }}
          />
          <button className="btn btn-secondary" onClick={checkUlpin} disabled={ulpin.length !== 14 || checking}>
            {checking ? '⏳' : '🔍 Check'}
          </button>
        </div>
        {found === 'found' && (
          <p className="text-sm text-[var(--color-success)] mt-2">✓ Found in DILRMP — pre-filling from existing records.</p>
        )}
        {found === 'new' && (
          <p className="text-sm text-[var(--color-warning)] mt-2">⚠ New ULPIN — not found in DILRMP. Proceeding with fresh entry.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Khasra / Survey Number *</label><input className="input" placeholder="e.g. K-456/B" /></div>
        <div><label className="label">State *</label>
          <select className="input" onChange={(e) => updateForm({ state: e.target.value })}>
            <option value="">Select State</option>
            {['Bihar', 'Maharashtra', 'Uttar Pradesh', 'Rajasthan', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'West Bengal'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="label">District *</label><input className="input" placeholder="e.g. Patna" onChange={(e) => updateForm({ district: e.target.value })} /></div>
        <div><label className="label">Sub-District / Tehsil *</label><input className="input" placeholder="e.g. Maner" /></div>
        <div><label className="label">Village / Mandal *</label><input className="input" placeholder="e.g. Maner Village" /></div>
        <div><label className="label">Area (Sqm) *</label><input className="input" type="number" placeholder="1200" onChange={(e) => updateForm({ area: e.target.value })} /></div>
      </div>

      <button className="btn btn-primary w-full" onClick={onNext} disabled={ulpin.length !== 14}>
        Continue to Boundary Mapping →
      </button>
    </div>
  )
}

// Step 2: Boundary Mapping
function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [method, setMethod] = useState<'draw' | 'upload' | 'manual'>('draw')

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Boundary Mapping</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">Define the exact parcel boundary using one of three methods.</p>

      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'draw', icon: '✏️', label: 'Draw on Map', desc: 'Click corner points on satellite map' },
          { id: 'upload', icon: '📁', label: 'Upload GeoJSON/KML', desc: 'From GPS survey equipment' },
          { id: 'manual', icon: '⌨️', label: 'Enter Coordinates', desc: 'Lat/long pairs for each corner' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id as typeof method)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${method === m.id ? 'border-[var(--color-gold)] bg-[var(--color-gold-pale)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold)]'}`}
          >
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-sm font-semibold">{m.label}</div>
            <div className="text-xs text-[var(--color-ink-faint)] mt-1">{m.desc}</div>
          </button>
        ))}
      </div>

      {method === 'draw' && (
        <div className="border-2 border-[var(--color-gold)] rounded-xl overflow-hidden">
          <div className="h-64 bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center relative">
            <div className="text-white text-center opacity-70">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm">Mapbox satellite map — click to define parcel corners</p>
              <p className="text-xs mt-1 opacity-60">Snap-to-edge enabled | Overlap detection active</p>
            </div>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 256">
              <polygon points="150,60 350,50 370,180 140,190" fill="rgba(184,134,11,0.3)" stroke="#B8860B" strokeWidth="2" strokeDasharray="5,3" />
              <circle cx="150" cy="60" r="6" fill="#B8860B" />
              <circle cx="350" cy="50" r="6" fill="#B8860B" />
              <circle cx="370" cy="180" r="6" fill="#B8860B" />
              <circle cx="140" cy="190" r="6" fill="#B8860B" />
            </svg>
          </div>
          <div className="p-4 bg-[var(--color-gold-pale)] grid grid-cols-3 gap-3 text-center text-sm">
            <div><div className="font-bold text-[var(--color-ink)]">2.41 Acres</div><div className="text-xs text-[var(--color-ink-faint)]">Area</div></div>
            <div><div className="font-bold text-[var(--color-ink)]">9,762 m²</div><div className="text-xs text-[var(--color-ink-faint)]">Square Meters</div></div>
            <div><div className="font-bold text-[var(--color-success)]">✓ No Overlaps</div><div className="text-xs text-[var(--color-ink-faint)]">Boundary Check</div></div>
          </div>
        </div>
      )}

      {method === 'upload' && (
        <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 text-center hover:border-[var(--color-gold)] transition-colors cursor-pointer">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium text-[var(--color-ink)]">Upload GeoJSON or KML file</p>
          <p className="text-sm text-[var(--color-ink-faint)] mt-1">Exported from GPS survey equipment or GIS software</p>
        </div>
      )}

      {method === 'manual' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-ink-muted)]">Enter latitude, longitude for each corner point (minimum 3 points):</p>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex gap-3 items-center">
              <span className="w-8 h-8 rounded-full bg-[var(--color-gold)] text-white text-sm flex items-center justify-center font-bold flex-shrink-0">{n}</span>
              <input className="input flex-1" placeholder="Latitude (e.g. 25.6140)" />
              <input className="input flex-1" placeholder="Longitude (e.g. 85.0950)" />
            </div>
          ))}
          <button className="btn btn-secondary btn-sm">+ Add Corner Point</button>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>Continue to Ownership →</button>
      </div>
    </div>
  )
}

// Step 3: Ownership
function Step3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [ownerType, setOwnerType] = useState<'individual' | 'joint' | 'company' | 'government'>('individual')

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Ownership Record</h2>
      <div className="flex gap-3 flex-wrap">
        {['individual', 'joint', 'company', 'government'].map((t) => (
          <button key={t} onClick={() => setOwnerType(t as typeof ownerType)}
            className={`btn btn-sm ${ownerType === t ? 'btn-primary' : 'btn-secondary'} capitalize`}>{t}</button>
        ))}
      </div>

      {ownerType === 'individual' && (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Full Name *</label><input className="input" placeholder="As per Aadhaar" /></div>
          <div><label className="label">Aadhaar Number *</label><input className="input" placeholder="XXXX XXXX XXXX" type="password" /></div>
          <div><label className="label">Father / Husband Name *</label><input className="input" placeholder="Full name" /></div>
          <div><label className="label">Date of Birth *</label><input className="input" type="date" /></div>
          <div className="col-span-2"><label className="label">Address *</label><textarea className="input min-h-[60px] resize-none" placeholder="Complete residential address" /></div>
          <div>
            <label className="label">Owner Photo</label>
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-4 text-center text-xs text-[var(--color-ink-faint)] cursor-pointer hover:border-[var(--color-gold)]">📷 Upload Photo</div>
          </div>
          <div className="flex items-end">
            <div className="p-3 bg-[var(--color-gold-pale)] rounded-lg text-xs text-[var(--color-ink-muted)] w-full">
              Aadhaar validation will be performed via UIDAI sandbox API before proceeding.
            </div>
          </div>
        </div>
      )}

      {ownerType === 'joint' && (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="card-cream p-4">
              <h4 className="font-semibold text-sm mb-3">Owner {n}</h4>
              <div className="grid grid-cols-2 gap-3">
                <input className="input text-sm" placeholder="Full Name" />
                <input className="input text-sm" placeholder="Aadhaar Number" type="password" />
                <input className="input text-sm col-span-2" placeholder="Ownership % (must total 100%)" type="number" max="100" />
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm">+ Add Another Owner</button>
        </div>
      )}

      {ownerType === 'company' && (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">CIN Number *</label><input className="input" placeholder="L12345MH2020PLC000001" /></div>
          <div><label className="label">Company Name *</label><input className="input" placeholder="As per MCA records" /></div>
          <div><label className="label">Authorized Signatory Name *</label><input className="input" /></div>
          <div><label className="label">Signatory Aadhaar *</label><input className="input" type="password" /></div>
        </div>
      )}

      {ownerType === 'government' && (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Department Name *</label><input className="input" placeholder="e.g. Ministry of Railways" /></div>
          <div><label className="label">Administrative Level *</label>
            <select className="input"><option>National</option><option>State</option><option>District</option><option>Municipal</option></select>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>Continue to Title Chain →</button>
      </div>
    </div>
  )
}

// Step 4: Historical Chain of Title (OCR)
function Step4({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [scanning, setScanning] = useState(false)
  const [docs, setDocs] = useState<any[]>([])

  const simulateScan = () => {
    setScanning(true)
    setTimeout(() => {
      setDocs([...docs, { 
        name: `Deed_${Date.now()}.pdf`, 
        type: 'Sale Deed', 
        date: '14/05/1994', 
        parties: 'Ramesh Singh → Suresh Kumar',
        verified: true 
      }])
      setScanning(false)
    }, 2000)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Historical Chain of Title</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">Upload historical deed scans. Our AI will extract party names and dates (OCR).</p>
      
      <div 
        onClick={simulateScan}
        className="border-2 border-dashed border-[var(--color-gold)/30] rounded-2xl p-10 text-center hover:bg-[var(--color-gold-pale)] cursor-pointer transition-all group"
      >
        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
        <p className="font-display font-bold text-[var(--color-ink)]">Upload 30-Year History</p>
        <p className="text-xs text-[var(--color-ink-muted)] mt-1">PDF, JPG, or PNG (Max 50MB per file)</p>
      </div>

      {scanning && (
        <div className="p-6 bg-[var(--color-gold-pale)] rounded-2xl flex items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-display italic text-[var(--color-gold)]">AWS Textract: Extracting entities from document...</p>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((d, i) => (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="card-cream p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">📜</span>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)]">{d.name}</p>
                <p className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">{d.parties}</p>
              </div>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-bold">OCR VERIFIED</span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext} disabled={docs.length === 0}>Continue to Encumbrance →</button>
      </div>
    </div>
  )
}

// Step 5: Encumbrance & Dispute Status
function Step5({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Encumbrance & Dispute Status</h2>
      <div className="grid grid-cols-1 gap-4">
        <div className="card-cream p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">🏦 Bank Mortgage Check</h3>
            <span className="text-[10px] text-green-500 font-mono">CONNECTED TO CERSAI</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 accent-gold" />
            <label className="text-sm">Is this parcel currently under mortgage?</label>
          </div>
          <input className="input" placeholder="Bank Name & Loan Account Number (if any)" />
        </div>

        <div className="card-cream p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">⚖️ e-Courts Dispute Scan</h3>
            <span className="text-[10px] text-gold font-mono">AUTO-SCANNING API...</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-5 h-5 accent-gold" />
            <label className="text-sm">Are there any pending court cases?</label>
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted)]">Searching for ULPIN matches in District & High Court databases...</p>
        </div>

        <div className="card-cream p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">🌳 Forest & Eco-Zone Check</h3>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs">GIS Analysis: No overlap with National Forest boundaries detected.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>Continue to Classification →</button>
      </div>
    </div>
  )
}

// Step 6: Land Classification & Attributes
function Step6({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Classification & Attributes</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Primary Land Type *</label>
          <select className="input">
            <option>Agricultural</option>
            <option>Residential</option>
            <option>Commercial</option>
            <option>Industrial</option>
            <option>Forest</option>
          </select>
        </div>
        <div>
          <label className="label">Irrigated Status *</label>
          <select className="input">
            <option>Fully Irrigated (Tube Well)</option>
            <option>Partially Irrigated (Rainfed)</option>
            <option>Dry Land</option>
          </select>
        </div>
        <div>
          <label className="label">Soil Type</label>
          <input className="input" placeholder="e.g. Alluvial, Black, Red" />
        </div>
        <div>
          <label className="label">Road Connectivity</label>
          <select className="input">
            <option>Motorable (Puccka)</option>
            <option>Kuccha Road</option>
            <option>No Road Access</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Existing Structures</label>
          <textarea className="input min-h-[60px]" placeholder="Detail any buildings, wells, or sheds present on the land..." />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>Continue to Review →</button>
      </div>
    </div>
  )
}

// Step 7: Review & Mint
function Step7({ onBack, formData }: { onBack: () => void; formData: any }) {
  const [minting, setMinting] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [minted, setMinted] = useState(false)
  const [otpSeller, setOtpSeller] = useState('')
  const [otpSupervisor, setOtpSupervisor] = useState('')

  // Editable contract params — pre-filled with demo data
  const [ownerAddr, setOwnerAddr] = useState(formData.ownerAddress || '0x0aF9Fda601342715aac0A63e6Cb0CF99c30845f3')
  const [ulpin, setUlpin] = useState(formData.ulpin || '14' + String(Date.now()).slice(-12))
  const [ipfsHash, setIpfsHash] = useState('QmPikachuBhoomiChainDemoHash1234567890abcdef')
  const [area, setArea] = useState(formData.area || '1200')
  const [districtCode, setDistrictCode] = useState(formData.district?.slice(0,3).toUpperCase() || 'MUM')
  const [stateCode, setStateCode] = useState('MH')
  const [landType, setLandType] = useState('1')
  const [latitudes, setLatitudes] = useState('19.076, 19.0765, 19.077, 19.076')
  const [longitudes, setLongitudes] = useState('72.877, 72.8775, 72.878, 72.877')

  const { writeContractAsync } = useWriteContract()
  const { isConnected } = useAccount()

  const parseCoords = (str: string) =>
    str.split(',').map(s => BigInt(Math.round(parseFloat(s.trim()) * 1_000_000)))

  const MINT_ABI = [{
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'ulpin', type: 'string' },
      { internalType: 'string', name: 'ipfsDocHash', type: 'string' },
      { internalType: 'bytes32', name: 'sha256DocHash', type: 'bytes32' },
      { internalType: 'uint8', name: 'landType', type: 'uint8' },
      { internalType: 'uint256', name: 'areaInSqm', type: 'uint256' },
      { internalType: 'string', name: 'districtCode', type: 'string' },
      { internalType: 'string', name: 'stateCode', type: 'string' },
      { internalType: 'int256[]', name: 'latitudes', type: 'int256[]' },
      { internalType: 'int256[]', name: 'longitudes', type: 'int256[]' },
    ],
    name: 'mintLandTitle',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  }] as const

  const handleMint = async () => {
    if (!isConnected) { alert('Please connect your wallet first.'); return }
    if (otpSeller !== '123456' || otpSupervisor !== '123456') {
      alert("Demo OTP is '123456' for both fields."); return
    }
    setMinting(true)
    try {
      const lats = parseCoords(latitudes)
      const longs = parseCoords(longitudes)
      const sha = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      const hash = await writeContractAsync({
        address: deployedAddresses.LandRegistry as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mintLandTitle',
        args: [
          ownerAddr as `0x${string}`,
          ulpin,
          ipfsHash,
          sha,
          parseInt(landType) as unknown as never,
          BigInt(area),
          districtCode,
          stateCode,
          lats,
          longs,
        ],
      })
      setTxHash(hash)
      setMinted(true)
    } catch (err: any) {
      console.error(err)
      alert('Minting failed: ' + (err?.shortMessage || err?.message || 'Unknown error'))
    } finally {
      setMinting(false)
    }
  }

  if (minted) return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
      <div className="text-8xl mb-5">🔐</div>
      <h2 className="font-display text-3xl font-bold text-[var(--color-success)] mb-2">Land Title Minted!</h2>
      <p className="text-[var(--color-ink-muted)] mb-4">Digital Title Certificate issued on Sepolia Testnet.</p>
      <div className="font-mono bg-[var(--color-cream)] rounded-lg p-4 text-sm mb-6 text-left break-all">
        <span className="text-[var(--color-ink-faint)]">Tx Hash: </span>
        <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
          className="text-[var(--color-gold)] hover:underline">{txHash}</a>
      </div>
      <Link href="/" className="btn btn-primary">Back to Gov Portal</Link>
    </motion.div>
  )

  const Field = ({ label, value, onChange, mono = false, hint = '' }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; hint?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input className={`input text-sm ${mono ? 'font-mono' : ''}`} value={value} onChange={e => onChange(e.target.value)} />
      {hint && <p className="text-[10px] text-[var(--color-ink-faint)] mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Supervisor Review & Blockchain Minting</h2>
      <div className="p-3 bg-[var(--color-warning-light)] rounded-xl text-sm text-[var(--color-warning)]">
        ⚠ <strong>Maker-Checker:</strong> Dual OTP required before on-chain commitment.
      </div>

      {/* Editable Contract Parameters */}
      <div className="border border-[var(--color-gold)] rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">⛓️</span>
          <h3 className="font-display font-semibold text-sm">Contract Parameters <span className="text-[10px] text-[var(--color-ink-faint)] font-normal">(editable — sent directly to Sepolia)</span></h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Owner Wallet Address" value={ownerAddr} onChange={setOwnerAddr} mono hint="The wallet that will receive the Land Title NFT" />
          </div>
          <Field label="ULPIN (14-digit)" value={ulpin} onChange={setUlpin} mono hint="Unique Land Parcel ID — must be exactly 14 chars" />
          <Field label="Area (sqm)" value={area} onChange={setArea} hint="Land area in square metres" />
          <Field label="District Code" value={districtCode} onChange={setDistrictCode} hint="e.g. MUM, DEL, BLR" />
          <Field label="State Code" value={stateCode} onChange={setStateCode} hint="e.g. MH, DL, KA" />
          <div className="col-span-2">
            <Field label="IPFS Document Hash" value={ipfsHash} onChange={setIpfsHash} mono hint="Qm... hash from IPFS upload" />
          </div>
          <div>
            <label className="label">Land Type</label>
            <select className="input text-sm" value={landType} onChange={e => setLandType(e.target.value)}>
              <option value="0">Agricultural</option>
              <option value="1">Residential</option>
              <option value="2">Commercial</option>
              <option value="3">Industrial</option>
              <option value="4">Forest</option>
            </select>
          </div>
          <div />
          <div className="col-span-2">
            <Field label="Latitudes (comma-separated decimal degrees)" value={latitudes} onChange={setLatitudes} mono hint="e.g. 19.076, 19.077, 19.078 — min 3 points required" />
          </div>
          <div className="col-span-2">
            <Field label="Longitudes (comma-separated decimal degrees)" value={longitudes} onChange={setLongitudes} mono hint="Must have same number of values as Latitudes" />
          </div>
        </div>
      </div>

      {/* Dual OTP */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3">📱 Uploader OTP</h4>
          <input className="input font-mono text-xl tracking-widest text-center" maxLength={6} placeholder="123456"
            value={otpSeller} onChange={e => setOtpSeller(e.target.value.replace(/\D/g, ''))} />
          <p className="text-[10px] text-center text-[var(--color-gold)] mt-2">Demo: use 123456</p>
        </div>
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3">📱 Supervisor OTP</h4>
          <input className="input font-mono text-xl tracking-widest text-center" maxLength={6} placeholder="123456"
            value={otpSupervisor} onChange={e => setOtpSupervisor(e.target.value.replace(/\D/g, ''))} />
          <p className="text-[10px] text-center text-[var(--color-gold)] mt-2">Demo: use 123456</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button
          className={`btn flex-1 ${minting ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleMint}
          disabled={minting || otpSeller !== '123456' || otpSupervisor !== '123456'}
        >
          {minting
            ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Broadcasting to Sepolia...</span>
            : '⛓️ Mint Land Title NFT'}
        </button>
      </div>
    </div>
  )
}

export default function UploadWizardPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    ulpin: '',
    area: '',
    district: '',
    state: '',
    ownerName: '',
    ownerAddress: ''
  })

  const updateForm = (updates: any) => setFormData(prev => ({ ...prev, ...updates }))
  const next = () => setStep((s) => Math.min(s + 1, 7))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <header className="bg-[var(--color-ink)] text-white py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--color-gold)] rounded-lg flex items-center justify-center font-display font-bold">B</div>
          <span className="font-display font-bold">BhoomiChain</span>
          <span className="text-gray-400 text-sm">Government Portal</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <span className="badge badge-success hidden md:block">Officer: Revenue Inspector Sharma</span>
          <ConnectButton />
          <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-ink)] mb-1">New Parcel Upload</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Step {step} of 7 — {STEPS[step - 1].label} — Auto-saved 2 minutes ago
          </p>
          <div className="progress-bar mt-3">
            <div className="progress-bar-fill" style={{ width: `${(step / 7) * 100}%` }} />
          </div>
        </div>

        <StepIndicator current={step} />

        <div className="card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <Step1 onNext={next} updateForm={updateForm} />}
              {step === 2 && <Step2 onNext={next} onBack={back} updateForm={updateForm} />}
              {step === 3 && <Step3 onNext={next} onBack={back} updateForm={updateForm} />}
              {step === 4 && <Step4 onNext={next} onBack={back} />}
              {step === 5 && <Step5 onNext={next} onBack={back} />}
              {step === 6 && <Step6 onNext={next} onBack={back} />}
              {step === 7 && <Step7 onBack={back} formData={formData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
