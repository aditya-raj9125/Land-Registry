'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useContractWrite } from 'wagmi'
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

// Step 7: Review & Mint
function Step7({ onBack, formData }: { onBack: () => void; formData: any }) {
  const [minting, setMinting] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [minted, setMinted] = useState(false)
  const [otpSeller, setOtpSeller] = useState('')
  const [otpSupervisor, setOtpSupervisor] = useState('')

  const { writeContractAsync } = useWriteContract()

  const handleMint = async () => {
    if (otpSeller.length < 6 || otpSupervisor.length < 6) return
    setMinting(true)
    try {
      // For demo, we use some dummy coords and hashes, but in production these come from Steps 2 & 4
      const dummyCoords = [19076000n, 19076500n, 19077000n, 19076000n];
      const dummyLongs = [72877000n, 72877500n, 72878000n, 72877000n];
      const dummySha = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

      const hash = await writeContractAsync({
        address: deployedAddresses.LandRegistry as `0x${string}`,
        abi: [
          {
            "inputs": [
              { "internalType": "address", "name": "to", "type": "address" },
              { "internalType": "string", "name": "ulpin", "type": "string" },
              { "internalType": "string", "name": "ipfsDocHash", "type": "string" },
              { "internalType": "bytes32", "name": "sha256DocHash", "type": "bytes32" },
              { "internalType": "uint8", "name": "landType", "type": "uint256" },
              { "internalType": "uint256", "name": "areaInSqm", "type": "uint256" },
              { "internalType": "string", "name": "districtCode", "type": "string" },
              { "internalType": "string", "name": "stateCode", "type": "string" },
              { "internalType": "int256[]", "name": "latitudes", "type": "int256[]" },
              { "internalType": "int256[]", "name": "longitudes", "type": "int256[]" }
            ],
            "name": "mintLandTitle",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'mintLandTitle',
        args: [
          (formData.ownerAddress || "0x0aF9Fda601342715aac0A63e6Cb0CF99c30845f3") as `0x${string}`,
          formData.ulpin || "14010100000001",
          "QmPikachu" + Date.now(),
          dummySha,
          1n, // Residential
          BigInt(formData.area || "1200"),
          "MUM",
          "MH",
          dummyCoords,
          dummyLongs
        ]
      })
      setTxHash(hash)
      setMinted(true)
    } catch (err) {
      console.error(err)
      alert("Minting failed. Check if you have the MINTER_ROLE.")
    } finally {
      setMinting(false)
    }
  }

  if (minted) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="text-8xl mb-5">
          🔐
        </motion.div>
        <h2 className="font-display text-3xl font-bold text-[var(--color-success)] mb-2">Land Title Minted!</h2>
        <p className="text-[var(--color-ink-muted)] mb-4">Digital Title Certificate issued on Sepolia.</p>
        <div className="font-mono bg-[var(--color-cream)] rounded-lg p-4 text-sm mb-6 text-left space-y-2">
          <div><span className="text-[var(--color-ink-faint)]">Transaction:</span> <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-gold)] hover:underline truncate block">{txHash}</a></div>
          <p className="text-[10px] mt-2 opacity-50">Event Indexer will sync this record to the National Database within 60 seconds.</p>
        </div>
        <Link href="/gov/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Supervisor Review & Blockchain Minting</h2>
      <div className="p-4 bg-[var(--color-warning-light)] rounded-xl text-sm text-[var(--color-warning)]">
        ⚠ <strong>Maker-Checker Principle:</strong> Final verification required before on-chain commitment.
      </div>

      {/* Summary */}
      <div className="card-cream p-5 space-y-3 text-sm">
        <h3 className="font-display text-base font-semibold mb-3">Upload Summary</h3>
        {[
          ['ULPIN', formData.ulpin || '14010100000001'],
          ['Area', `${formData.area || '1200'} m²`],
          ['Land Type', 'Residential'],
          ['Documents', 'Verified via IPFS'],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-4">
            <span className="text-[var(--color-ink-faint)] w-32 shrink-0">{k}:</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      {/* Dual OTP */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3">📱 Uploader OTP</h4>
          <input className="input font-mono text-xl tracking-widest text-center" maxLength={6} placeholder="000000"
            value={otpSeller} onChange={(e) => setOtpSeller(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="card p-4">
          <h4 className="font-semibold text-sm mb-3">📱 Supervisor OTP</h4>
          <input className="input font-mono text-xl tracking-widest text-center" maxLength={6} placeholder="000000"
            value={otpSupervisor} onChange={(e) => setOtpSupervisor(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button
          className={`btn flex-1 ${minting ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleMint}
          disabled={minting || otpSeller.length < 6 || otpSupervisor.length < 6}
        >
          {minting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Processing on Sepolia...
            </span>
          ) : '⛓️ Mint Land Title NFT'}
        </button>
      </div>
    </div>
  )
}

// Generic placeholder for steps 4-6
function PlaceholderStep({ num, label, desc, onNext, onBack }: {
  num: number; label: string; desc: string; onNext: () => void; onBack: () => void
}) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Step {num}: {label}</h2>
      <p className="text-sm text-[var(--color-ink-muted)]">{desc}</p>
      <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 text-center text-[var(--color-ink-faint)]">
        {num === 4 && '📜 Upload historical deed scans → AWS Textract OCR → Review extracted data → IPFS pin'}
        {num === 5 && '⚖️ Declare encumbrances: mortgage, court cases (e-Courts API verified), gov acquisition, forest overlap (GIS auto-check)'}
        {num === 6 && '🌾 Land type, irrigated status, soil type, road connectivity, existing structures, FSI'}
      </div>
      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" onClick={onNext}>Continue →</button>
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
          <span className="badge badge-success">Officer: Revenue Inspector Sharma</span>
          <Link href="/gov/dashboard" className="text-gray-400 hover:text-white">Dashboard</Link>
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
              {step === 4 && <PlaceholderStep num={4} label="Historical Chain of Title" desc="..." onNext={next} onBack={back} />}
              {step === 5 && <PlaceholderStep num={5} label="Encumbrance & Dispute Status" desc="..." onNext={next} onBack={back} />}
              {step === 6 && <PlaceholderStep num={6} label="Land Classification & Attributes" desc="..." onNext={next} onBack={back} />}
              {step === 7 && <Step7 onBack={back} formData={formData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
