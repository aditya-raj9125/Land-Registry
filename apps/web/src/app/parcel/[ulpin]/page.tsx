'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { use } from 'react'

// Mock parcel data — in production pulled from PostgreSQL/chain
const PARCEL_DATA: Record<string, {
  ulpin: string; khasra: string; area: string; areaM2: number; district: string; state: string;
  village: string; landType: string; titleStatus: string; owner: string; aadhaarVerified: boolean;
  tokenId: number; ownerSince: string; askingPrice: string; askingEth: string;
  stampDuty: string; regFee: string; totalCost: string;
  encumbrance: { mortgage: boolean; courtCase: boolean; govAcquisition: boolean; forestOverlap: boolean };
  coordinates: [number, number][];
  documents: { type: string; date: string; ipfs: string }[];
  priceHistory: { date: string; price: number }[];
  onChainHistory: { event: string; date: string; tx: string }[];
  ownerHistory: { initials: string; from: string; to?: string; verified: boolean }[];
  road: string; water: boolean; electricity: boolean;
}> = {
  '14010100000001': {
    ulpin: '14010100000001',
    khasra: 'K-456/B',
    area: '2.4 Acres (9,713 sq.m)',
    areaM2: 9713,
    district: 'Patna',
    state: 'Bihar',
    village: 'Maner',
    landType: 'Agricultural',
    titleStatus: 'CLEAR',
    owner: 'Rajesh K.',
    aadhaarVerified: true,
    tokenId: 1,
    ownerSince: '14/02/2024',
    askingPrice: '₹32,00,000',
    askingEth: '0.42 ETH',
    stampDuty: '₹1,92,000',
    regFee: '₹32,000',
    totalCost: '₹34,24,000',
    encumbrance: { mortgage: false, courtCase: false, govAcquisition: false, forestOverlap: false },
    coordinates: [[25.614, 85.095], [25.615, 85.098], [25.612, 85.099], [25.611, 85.096]],
    documents: [
      { type: 'Sale Deed (2024)', date: '14/02/2024', ipfs: 'QmXyz...abc' },
      { type: 'Sale Deed (2011)', date: '22/08/2011', ipfs: 'QmXyz...def' },
      { type: 'Inheritance Deed (1998)', date: '05/03/1998', ipfs: 'QmXyz...ghi' },
      { type: 'Survey Map', date: '01/01/2023', ipfs: 'QmXyz...jkl' },
      { type: 'Property Tax Receipt 2024', date: '15/04/2024', ipfs: 'QmXyz...mno' },
    ],
    priceHistory: [
      { date: '2019', price: 15 }, { date: '2020', price: 18 }, { date: '2021', price: 20 },
      { date: '2022', price: 24 }, { date: '2023', price: 28 }, { date: '2024', price: 32 },
    ],
    onChainHistory: [
      { event: 'Title Minted', date: '14/02/2024', tx: '0x1a2b...3c4d' },
      { event: 'Aadhaar Verified', date: '14/02/2024', tx: '0x5e6f...7a8b' },
    ],
    ownerHistory: [
      { initials: 'R.K.', from: '14/02/2024', verified: true },
      { initials: 'M.S.', from: '22/08/2011', to: '14/02/2024', verified: true },
      { initials: 'R.P.', from: '05/03/1998', to: '22/08/2011', verified: false },
    ],
    road: 'Motorable Road (0.3 km)',
    water: true,
    electricity: true,
  },
}

function EncumbranceRow({ label, clear }: { label: string; clear: boolean }) {
  return (
    <tr>
      <td className="py-3 px-4 text-sm text-[var(--color-ink-muted)]">{label}</td>
      <td className="py-3 px-4">
        {clear ? (
          <span className="text-[var(--color-success)] text-sm font-medium flex items-center gap-1">✓ Clear</span>
        ) : (
          <span className="text-[var(--color-danger)] text-sm font-medium flex items-center gap-1">⚠ Flagged</span>
        )}
      </td>
    </tr>
  )
}

export default function ParcelDetailPage({ params }: { params: Promise<{ ulpin: string }> }) {
  const { ulpin } = use(params)
  const [offerModal, setOfferModal] = useState(false)
  const parcel = PARCEL_DATA[ulpin] || PARCEL_DATA['14010100000001']

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    CLEAR: { color: 'var(--color-success)', bg: 'var(--color-success-light)', label: '✓ Title Clear — Safe to Transact' },
    PENDING: { color: 'var(--color-warning)', bg: 'var(--color-warning-light)', label: '⏳ Pending Verification' },
    DISPUTED: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', label: '⚠ Disputed — Do Not Transact' },
    ENCUMBERED: { color: 'var(--color-danger)', bg: 'var(--color-danger-light)', label: '🔒 Encumbered — Mortgage Active' },
  }
  const sc = statusConfig[parcel.titleStatus] || statusConfig.CLEAR

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">

      {/* Sticky Nav */}
      <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-3 px-6 flex items-center gap-4 sticky top-0 z-30">
        <Link href="/" className="text-[var(--color-gold)] font-display font-bold text-lg">BhoomiChain</Link>
        <span className="text-[var(--color-ink-faint)]">/</span>
        <Link href="/search" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)]">Search</Link>
        <span className="text-[var(--color-ink-faint)]">/</span>
        <span className="font-mono text-sm text-[var(--color-ink)]">{parcel.ulpin}</span>
      </nav>

      {/* Hero Satellite Image */}
      <div className="relative h-80 bg-gradient-to-br from-green-800 via-green-600 to-yellow-600 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-9xl">🛰️</div>
        {/* Parcel boundary overlay */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points="20,20 80,15 85,70 15,75"
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="0.5"
            strokeDasharray="2,1"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="font-mono text-white/60 text-xs mb-1">ULPIN: {parcel.ulpin}</div>
          <h1 className="font-display text-3xl text-white font-bold">{parcel.area}</h1>
          <p className="text-white/80 mt-1">📍 {parcel.village}, {parcel.district}, {parcel.state}</p>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className="py-3 px-6 text-center font-medium text-sm"
        style={{ backgroundColor: sc.bg, color: sc.color }}
      >
        {sc.label}
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-10 flex gap-8 items-start">

        {/* Left Column (65%) */}
        <div className="flex-1 space-y-8">

          {/* Ownership */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Current Ownership</h2>
            <div className="flex items-center gap-4 p-4 bg-[var(--color-cream)] rounded-lg">
              <div className="w-12 h-12 rounded-full bg-[var(--color-gold)] flex items-center justify-center text-white font-bold text-lg font-display">
                {parcel.owner[0]}
              </div>
              <div>
                <div className="font-semibold text-[var(--color-ink)]">{parcel.owner}</div>
                <div className="flex items-center gap-2 mt-1">
                  {parcel.aadhaarVerified && (
                    <span className="badge badge-success text-xs">Aadhaar Verified</span>
                  )}
                  <span className="font-mono text-xs text-[var(--color-ink-faint)]">Token #{parcel.tokenId}</span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-[var(--color-ink-faint)]">Owner Since</div>
                <div className="font-medium text-[var(--color-ink)]">{parcel.ownerSince}</div>
              </div>
            </div>

            <h3 className="font-display text-base font-semibold mt-6 mb-4 text-[var(--color-ink-muted)]">Ownership History</h3>
            <div className="relative pl-6">
              {parcel.ownerHistory.map((h, i) => (
                <div key={i} className="relative pb-5 last:pb-0">
                  <div className="absolute left-[-1.5rem] w-3 h-3 rounded-full bg-[var(--color-gold)] border-2 border-[var(--color-surface)] top-1" />
                  {i < parcel.ownerHistory.length - 1 && (
                    <div className="absolute left-[-1.25rem] w-0.5 h-full bg-[var(--color-border)] top-4" />
                  )}
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{h.initials}</span>
                    {h.verified && <span className="badge badge-success text-xs">Verified</span>}
                    <span className="text-xs text-[var(--color-ink-faint)] ml-auto">
                      {h.from}{h.to ? ` → ${h.to}` : ' → Present'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Documents */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Legal Documents</h2>
            <div className="space-y-3">
              {parcel.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[var(--color-cream)] rounded-lg">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-[var(--color-ink)]">{doc.type}</div>
                    <div className="font-mono text-xs text-[var(--color-ink-faint)] mt-0.5">{doc.date}</div>
                  </div>
                  <a
                    href={`https://ipfs.io/ipfs/${doc.ipfs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    View on IPFS
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* Encumbrance */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Encumbrance Certificate</h2>
            <table className="data-table">
              <tbody>
                <EncumbranceRow label="Mortgage / Bank Loan" clear={!parcel.encumbrance.mortgage} />
                <EncumbranceRow label="Court Dispute" clear={!parcel.encumbrance.courtCase} />
                <EncumbranceRow label="Government Acquisition Notice" clear={!parcel.encumbrance.govAcquisition} />
                <EncumbranceRow label="Forest Boundary Overlap" clear={!parcel.encumbrance.forestOverlap} />
              </tbody>
            </table>
          </section>

          {/* Price History */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">Price History</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={parcel.priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-ink-muted)' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-ink-muted)' }}
                  tickFormatter={(v) => `₹${v}L`}
                />
                <Tooltip
                  formatter={(v: number) => [`₹${v} Lakhs`, 'Price']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-gold)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-gold)', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* On-Chain History */}
          <section className="card">
            <h2 className="font-display text-xl font-semibold mb-5">On-Chain Transaction History</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {parcel.onChainHistory.map((h, i) => (
                  <tr key={i}>
                    <td className="font-medium text-sm">{h.event}</td>
                    <td className="text-sm text-[var(--color-ink-muted)]">{h.date}</td>
                    <td>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${h.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-xs text-[var(--color-gold)] hover:underline"
                      >
                        {h.tx}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Right Sticky Column (35%) */}
        <div className="w-80 shrink-0 sticky top-20 space-y-5">

          {/* Price Card */}
          <div className="card border-[var(--color-gold)]">
            <div className="font-display text-4xl font-bold text-[var(--color-gold)] mb-1">
              {parcel.askingPrice}
            </div>
            <div className="font-mono text-sm text-[var(--color-ink-muted)] mb-5">
              ({parcel.askingEth})
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Sale Price</span>
                <span className="font-medium">{parcel.askingPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Stamp Duty (6%)</span>
                <span className="font-medium">{parcel.stampDuty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Registration Fee (1%)</span>
                <span className="font-medium">{parcel.regFee}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="font-semibold">Total Cost</span>
                <span className="font-bold text-[var(--color-ink)]">{parcel.totalCost}</span>
              </div>
            </div>

            {parcel.titleStatus === 'CLEAR' ? (
              <>
                <button
                  className="btn btn-primary w-full mb-3"
                  onClick={() => setOfferModal(true)}
                >
                  Make an Offer
                </button>
                <button className="btn btn-secondary w-full">+ Add to Watchlist</button>
              </>
            ) : (
              <div className="p-3 bg-[var(--color-danger-light)] rounded-lg text-sm text-[var(--color-danger)] text-center">
                This property cannot be transacted at this time.
              </div>
            )}
          </div>

          {/* Attributes */}
          <div className="card">
            <h3 className="font-display text-base font-semibold mb-4">Parcel Attributes</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Type', parcel.landType],
                ['Area', parcel.area],
                ['Village', parcel.village],
                ['District', parcel.district],
                ['State', parcel.state],
                ['Road Access', parcel.road],
                ['Water', parcel.water ? '✓ Available' : '✗ None'],
                ['Electricity', parcel.electricity ? '✓ Connected' : '✗ None'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--color-ink-muted)]">{k}</span>
                  <span className="font-medium text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Map */}
          <div className="card p-3">
            <h3 className="font-display text-sm font-semibold mb-2 px-2">Location</h3>
            <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center text-5xl opacity-50">
              🗺️
            </div>
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

      {/* Make Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card max-w-md w-full"
          >
            <h2 className="font-display text-2xl font-bold mb-2">Make an Offer</h2>
            <p className="text-[var(--color-ink-muted)] text-sm mb-6">
              ULPIN: <span className="font-mono">{parcel.ulpin}</span>
            </p>
            <div className="mb-4">
              <label className="label">Your Offer (₹)</label>
              <input type="number" className="input" placeholder="e.g. 3000000" defaultValue="3200000" />
            </div>
            <div className="mb-6">
              <label className="label">Cover Letter (Optional)</label>
              <textarea className="input min-h-[80px] resize-none" placeholder="Introduce yourself to the seller..." />
            </div>
            <div className="flex gap-3">
              <button className="btn btn-primary flex-1" onClick={() => setOfferModal(false)}>
                Send Offer
              </button>
              <button className="btn btn-ghost flex-1" onClick={() => setOfferModal(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
