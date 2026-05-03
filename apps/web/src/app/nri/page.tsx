'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function NRIPage() {
  const [tab, setTab] = useState<'overview' | 'poa' | 'multisig' | 'sentinel'>('overview')

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-4 px-6 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold text-[var(--color-gold)]">BhoomiChain</Link>
        <span className="text-sm text-[var(--color-ink-muted)]">NRI Protection Services</span>
      </nav>

      {/* Hero */}
      <section className="bg-[var(--color-ink)] py-20 px-6">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/30 rounded-full px-4 py-2 mb-6">
            <span>✈️</span>
            <span className="text-[var(--color-gold)] text-sm">Non-Resident Indian Services</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">
            Your Indian Land,<br />
            <span className="text-[var(--color-gold)] italic">Protected Forever.</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto mb-8">
            Monitor your property 24/7 from anywhere in the world. Grant Power of Attorney on-chain. Enable multi-sig security. No in-person visits required.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="btn btn-primary btn-lg">Register as NRI</button>
            <Link href="/dashboard" className="btn btn-secondary btn-lg" style={{ borderColor: 'rgba(184,134,11,0.5)', color: 'var(--color-gold)' }}>
              My Properties
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Tabs */}
      <div className="max-w-[900px] mx-auto px-6 py-10">
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'overview', label: '🏠 Overview' },
            { id: 'sentinel', label: '🛡️ Property Sentinel' },
            { id: 'poa', label: '📋 On-Chain PoA' },
            { id: 'multisig', label: '🔐 Multi-Sig Mode' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: '🚨', title: 'Instant Alerts', desc: 'Any mutation attempt, transfer initiation, encumbrance, or dispute triggers a multi-channel alert — WhatsApp, email, SMS, and push notification — within 60 seconds.' },
              { icon: '📋', title: 'On-Chain PoA', desc: 'Grant Power of Attorney entirely on-chain. Specify which parcels, which actions, and an expiry date. Revoke with one transaction from anywhere in the world.' },
              { icon: '🔐', title: 'Multi-Sig Security', desc: 'Require 2-of-3 signatures from trusted people (you + sibling + lawyer) before ANY transfer can proceed. The smart contract enforces this — no exceptions.' },
              { icon: '📹', title: 'Remote KYC', desc: 'Complete full KYC via a scheduled video call with a government-authorized officer. No physical visit to India required.' },
              { icon: '📄', title: 'Digital Title', desc: 'Your land title is a permanent digital record. Download your Title Certificate with QR code at any time — accepted by courts and banks as official proof.' },
              { icon: '🌐', title: 'Global Access', desc: 'Monitor all your Indian property from one dashboard. Real-time blockchain data — no lag, no intermediary, no bribe.' },
            ].map((f) => (
              <motion.div key={f.title} whileHover={{ scale: 1.02 }} className="card">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'sentinel' && (
          <div className="space-y-5">
            <div className="card border-[var(--color-gold)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--color-success-light)] rounded-full flex items-center justify-center text-xl">🟢</div>
                <div>
                  <h3 className="font-display text-lg font-semibold">Property Sentinel Active</h3>
                  <p className="text-sm text-[var(--color-ink-muted)]">Monitoring 2 parcels · Last check: 2 minutes ago</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {['14010100000001', '27020200000042'].map((u) => (
                  <div key={u} className="p-3 bg-[var(--color-cream)] rounded-lg flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-success)] animate-pulse" />
                    <span className="font-mono text-sm">...{u.slice(-6)}</span>
                    <span className="badge badge-success ml-auto text-xs">Protected</span>
                  </div>
                ))}
              </div>
              <h4 className="font-semibold text-sm mb-3">Alert Settings</h4>
              <div className="space-y-2">
                {[
                  'Any mutation / ownership change attempt',
                  'Transfer initiation by anyone',
                  'New encumbrance (mortgage) added',
                  'Dispute or court case filed',
                  'Parcel frozen by court',
                ].map((alert) => (
                  <label key={alert} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[var(--color-gold)] w-4 h-4" />
                    <span className="text-sm text-[var(--color-ink-muted)]">{alert}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-3">
                <div><label className="label">WhatsApp Number</label><input className="input text-sm" placeholder="+91 98765 43210" /></div>
                <div><label className="label">Email</label><input className="input text-sm" type="email" placeholder="you@email.com" /></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'poa' && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="font-display text-xl font-semibold mb-4">Grant Power of Attorney</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Grantee Wallet Address</label>
                  <input className="input font-mono text-sm" placeholder="0x..." />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input className="input" type="date" />
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Parcels (leave blank for all)</label>
                <input className="input" placeholder="ULPIN1, ULPIN2 or leave blank for all your parcels" />
              </div>
              <div className="mb-4">
                <label className="label">Allowed Actions</label>
                <div className="flex flex-wrap gap-2">
                  {['List for Sale', 'Negotiate', 'Sign Deed', 'Accept Payment', 'All Actions'].map((a) => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-gold)]">
                      <input type="checkbox" className="accent-[var(--color-gold)]" />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-[var(--color-gold-pale)] rounded-lg text-sm text-[var(--color-ink-muted)] mb-4">
                ℹ️ This PoA is recorded permanently on-chain. The grantee cannot act outside the defined scope. You can revoke it instantly with one transaction.
              </div>
              <button className="btn btn-primary w-full">Grant PoA On-Chain</button>
            </div>

            <div className="card">
              <h3 className="font-display text-base font-semibold mb-4">Active Powers of Attorney</h3>
              <div className="text-center py-8 text-[var(--color-ink-faint)]">
                No active PoA granted
              </div>
            </div>
          </div>
        )}

        {tab === 'multisig' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-3xl">🔐</div>
              <div>
                <h3 className="font-display text-xl font-semibold">Multi-Sig Security Mode</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">Require 2-of-3 trusted signatures for any transfer</p>
              </div>
            </div>
            <div className="p-4 bg-[var(--color-warning-light)] rounded-xl text-sm text-[var(--color-warning)] mb-5">
              ⚠️ When enabled, NO transfer can proceed without approval from at least 2 of your 3 configured guardians. The smart contract enforces this — even a court order cannot bypass it without the proper signatures.
            </div>
            <div className="space-y-4 mb-5">
              {['Yourself (You)', 'Trusted Family Member / Sibling', 'Lawyer / CA / Advisor'].map((label, i) => (
                <div key={i}>
                  <label className="label">Guardian {i + 1}: {label}</label>
                  <input className="input font-mono text-sm" placeholder={`0x${label.toLowerCase().replace(/\W/g, '').slice(0, 6)}...`} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5 p-4 bg-[var(--color-cream)] rounded-lg">
              <input type="checkbox" id="multisig-toggle" className="accent-[var(--color-gold)] w-5 h-5" />
              <label htmlFor="multisig-toggle" className="text-sm font-medium cursor-pointer">
                Enable Multi-Sig Mode for all my properties
              </label>
            </div>
            <button className="btn btn-primary w-full">Save Multi-Sig Configuration</button>
          </div>
        )}
      </div>
    </div>
  )
}
