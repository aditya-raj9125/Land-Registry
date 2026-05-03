'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const COMPLAINT_TYPES = [
  'Boundary Encroachment',
  'Wrong Ownership in Records',
  'Fraudulent Transfer',
  'Officer Misconduct',
  'System Error',
  'Other',
]

export default function GrievancePage() {
  const [mode, setMode] = useState<'file' | 'track'>('file')
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [trackId, setTrackId] = useState('')
  const [form, setForm] = useState({ type: '', details: '', ulpin: '', district: '' })

  const complaintId = 'GRV-2025-08492'

  const MOCK_STATUS = {
    id: complaintId,
    type: 'Boundary Encroachment',
    filed: '01/05/2025',
    history: [
      { date: '01/05/2025', status: 'Filed', officer: 'System', note: 'Complaint received and assigned to Patna District Office.' },
      { date: '02/05/2025', status: 'Acknowledged', officer: 'Revenue Inspector Sharma', note: 'Case reviewed. Field visit scheduled for 08/05/2025.' },
      { date: '03/05/2025', status: 'Under Review', officer: 'Revenue Inspector Sharma', note: 'Field verification in progress.' },
    ],
    currentStatus: 'Under Review',
    escalateBy: '08/05/2025',
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">

      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-6">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-gold)] font-display font-bold text-xl">BhoomiChain</Link>
            <span className="text-[var(--color-ink-faint)]">/</span>
            <span className="text-sm text-[var(--color-ink-muted)]">Grievance & Dispute Portal</span>
          </div>
          <a href="tel:1800XXXXXXX" className="text-sm text-[var(--color-ink-muted)]">
            📞 1800-XXX-XXXX (Toll Free)
          </a>
        </div>
      </header>

      <div className="max-w-[900px] mx-auto px-6 py-10">

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-[var(--color-ink)] mb-3">
            Grievance Portal
          </h1>
          <p className="text-[var(--color-ink-muted)] max-w-xl mx-auto">
            File complaints about land records, boundary disputes, or officer misconduct. Every action is logged permanently on the blockchain — no complaint can disappear.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 justify-center mb-8">
          <button
            className={`btn ${mode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('file')}
          >
            📝 File a Complaint
          </button>
          <button
            className={`btn ${mode === 'track' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('track')}
          >
            🔍 Track Status
          </button>
        </div>

        {/* File Complaint */}
        {mode === 'file' && !submitted && (
          <div className="card max-w-2xl mx-auto">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                {['Complaint Type', 'Details', 'Submit'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`step-dot text-xs ${i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'pending'}`}>
                      {i + 1 < step ? '✓' : i + 1}
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-display text-2xl font-semibold">What is your complaint about?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {COMPLAINT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type })}
                      className={`p-4 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                        form.type === type
                          ? 'border-[var(--color-gold)] bg-[var(--color-gold-pale)] text-[var(--color-gold)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-gold)]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-primary w-full mt-4"
                  disabled={!form.type}
                  onClick={() => setStep(2)}
                >
                  Continue →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-display text-2xl font-semibold">{form.type}</h2>
                <div>
                  <label className="label">ULPIN (if applicable)</label>
                  <input className="input" placeholder="14-digit Bhu-Aadhaar number"
                    value={form.ulpin} onChange={(e) => setForm({ ...form, ulpin: e.target.value })} />
                </div>
                <div>
                  <label className="label">District</label>
                  <input className="input" placeholder="e.g. Patna, Bihar"
                    value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
                <div>
                  <label className="label">Describe the Issue *</label>
                  <textarea
                    className="input min-h-[120px] resize-none"
                    placeholder="Provide as much detail as possible — dates, names, what happened..."
                    value={form.details}
                    onChange={(e) => setForm({ ...form, details: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Upload Evidence (optional)</label>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center text-[var(--color-ink-faint)] text-sm hover:border-[var(--color-gold)] transition-colors cursor-pointer">
                    📁 Click to upload photos, scanned documents, or maps
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-ghost flex-1" onClick={() => setStep(1)}>← Back</button>
                  <button
                    className="btn btn-primary flex-1"
                    disabled={!form.details || form.details.length < 20}
                    onClick={() => setStep(3)}
                  >
                    Review →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-display text-2xl font-semibold">Review & Submit</h2>
                <div className="bg-[var(--color-cream)] rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex gap-3"><span className="text-[var(--color-ink-muted)] w-28">Type:</span><span className="font-medium">{form.type}</span></div>
                  {form.ulpin && <div className="flex gap-3"><span className="text-[var(--color-ink-muted)] w-28">ULPIN:</span><span className="font-mono">{form.ulpin}</span></div>}
                  {form.district && <div className="flex gap-3"><span className="text-[var(--color-ink-muted)] w-28">District:</span><span>{form.district}</span></div>}
                  <div className="flex gap-3"><span className="text-[var(--color-ink-muted)] w-28">Details:</span><span className="leading-relaxed">{form.details}</span></div>
                </div>
                <div className="p-3 bg-[var(--color-gold-pale)] rounded-lg text-sm text-[var(--color-ink-muted)]">
                  ℹ️ By submitting, this complaint will be permanently logged on-chain via AuditLogger.sol and routed to the appropriate officer.
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-ghost flex-1" onClick={() => setStep(2)}>← Edit</button>
                  <button className="btn btn-primary flex-1" onClick={() => setSubmitted(true)}>
                    Submit Complaint
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submitted confirmation */}
        {mode === 'file' && submitted && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card max-w-2xl mx-auto text-center py-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-7xl mb-5"
            >
              ✅
            </motion.div>
            <h2 className="font-display text-3xl font-bold text-[var(--color-success)] mb-3">Complaint Filed</h2>
            <div className="font-mono text-2xl font-bold text-[var(--color-gold)] mb-3">{complaintId}</div>
            <p className="text-[var(--color-ink-muted)] mb-6 max-w-sm mx-auto text-sm">
              Your complaint has been logged permanently on the blockchain and routed to the district officer. You will receive an SMS update.
            </p>
            <div className="p-4 bg-[var(--color-cream)] rounded-xl text-sm text-left space-y-2 mb-6">
              <div className="flex gap-3"><span className="text-[var(--color-ink-faint)] w-36">Expected Response:</span><span className="font-medium">3 business days</span></div>
              <div className="flex gap-3"><span className="text-[var(--color-ink-faint)] w-36">Auto-escalates on:</span><span className="font-medium">08/05/2025 (if no response)</span></div>
              <div className="flex gap-3"><span className="text-[var(--color-ink-faint)] w-36">Logged on-chain:</span><span className="font-mono text-xs">0xabc1...2345</span></div>
            </div>
            <button className="btn btn-secondary" onClick={() => { setMode('track'); setTrackId(complaintId) }}>
              Track Status →
            </button>
          </motion.div>
        )}

        {/* Track Status */}
        {mode === 'track' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="card">
              <label className="label">Enter Complaint ID</label>
              <div className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder="GRV-2025-XXXXX"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                />
                <button className="btn btn-primary">Track</button>
              </div>
            </div>

            {(trackId === complaintId || trackId === '') && (
              <div className="card">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{complaintId}</h3>
                    <p className="text-sm text-[var(--color-ink-muted)] mt-1">{MOCK_STATUS.type} · Filed {MOCK_STATUS.filed}</p>
                  </div>
                  <span className="badge badge-warning">{MOCK_STATUS.currentStatus}</span>
                </div>

                {/* Auto-escalation warning */}
                <div className="p-3 bg-[var(--color-warning-light)] rounded-lg text-sm text-[var(--color-warning)] mb-6">
                  ⏰ Auto-escalates to State Level on {MOCK_STATUS.escalateBy} if unresolved
                </div>

                {/* Timeline */}
                <h4 className="font-display text-base font-semibold mb-4">Status History (Immutable)</h4>
                <div className="relative pl-6 space-y-5">
                  {MOCK_STATUS.history.map((item, i) => (
                    <div key={i} className="relative">
                      <div className="absolute left-[-1.5rem] w-3 h-3 rounded-full bg-[var(--color-gold)] border-2 border-[var(--color-surface)] top-1" />
                      {i < MOCK_STATUS.history.length - 1 && (
                        <div className="absolute left-[-1.18rem] w-0.5 bg-[var(--color-border)] top-4" style={{ height: 'calc(100% + 8px)' }} />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-success text-xs">{item.status}</span>
                        <span className="text-xs text-[var(--color-ink-faint)]">{item.date}</span>
                        <span className="text-xs text-[var(--color-ink-faint)]">— {item.officer}</span>
                      </div>
                      <p className="text-sm text-[var(--color-ink-muted)]">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
