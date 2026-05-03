'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const OWNED_PARCELS = [
  { ulpin: '14010100000001', area: '2.4 Acres Agricultural', district: 'Patna, Bihar', value: '₹32,00,000', status: 'CLEAR', tokenId: 1, listed: false },
  { ulpin: '27020200000042', area: '1,200 sq.ft Residential', district: 'Pune, Maharashtra', value: '₹85,00,000', status: 'CLEAR', tokenId: 42, listed: true },
]

const ACTIVE_TX = [
  {
    saleId: 'SALE-0042',
    ulpin: '27020200000042',
    step: 5,
    stepLabel: 'Government Approval',
    buyer: 'A.M.',
    price: '₹85,00,000',
    startedOn: '28/04/2025',
  }
]

const TX_HISTORY = [
  { ulpin: '09030100000108', type: 'Sold', party: 'R.P.', date: '12/02/2024', amount: '₹18,50,000', tx: '0x9a1b...2c3d' },
  { ulpin: '14010100000001', type: 'Bought', party: 'M.S.', date: '14/02/2024', amount: '₹28,00,000', tx: '0x3e4f...5a6b' },
]

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 mt-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className={`step-dot text-xs ${i + 1 < current ? 'completed' : i + 1 === current ? 'active' : 'pending'}`}>
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`step-line ${i + 1 < current ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [tab, setTab] = useState<'properties' | 'transactions' | 'active' | 'documents' | 'watchlist'>('properties')

  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="w-8 h-8 bg-[var(--color-gold)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold font-display">B</span>
          </div>
          <span className="font-display font-bold text-[var(--color-ink)]">BhoomiChain</span>
        </div>

        <nav className="sidebar-nav">
          {[
            { icon: '🏠', label: 'My Properties', tab: 'properties' },
            { icon: '🔄', label: 'Active Transactions', tab: 'active' },
            { icon: '📋', label: 'Transaction History', tab: 'transactions' },
            { icon: '📁', label: 'Document Vault', tab: 'documents' },
            { icon: '👁', label: 'Watchlist', tab: 'watchlist' },
          ].map((item) => (
            <button
              key={item.tab}
              className={`sidebar-link w-full text-left ${tab === item.tab ? 'active' : ''}`}
              onClick={() => setTab(item.tab as typeof tab)}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            {[
              { icon: '🔍', label: 'Search Land', href: '/search' },
              { icon: '🗺', label: 'Map View', href: '/map' },
              { icon: '⚖️', label: 'Grievance', href: '/grievance' },
              { icon: '✈️', label: 'NRI Services', href: '/nri' },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="sidebar-link">
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-gold-pale)] border border-[var(--color-gold)] flex items-center justify-center text-sm font-bold text-[var(--color-gold)]">
              R
            </div>
            <div className="text-sm">
              <div className="font-medium text-[var(--color-ink)]">Rajesh K.</div>
              <div className="text-xs text-[var(--color-ink-faint)]">Aadhaar Verified</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content p-8">

        <div className="page-header -mx-8 -mt-8 mb-8 px-8 py-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              {tab === 'properties' ? 'My Properties' :
               tab === 'active' ? 'Active Transactions' :
               tab === 'transactions' ? 'Transaction History' :
               tab === 'documents' ? 'Document Vault' : 'Watchlist'}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">Manage your land portfolio</p>
          </div>
          <div className="flex gap-3">
            <Link href="/search" className="btn btn-secondary btn-sm">Search Land</Link>
            <Link href="/nri" className="btn btn-ghost btn-sm">NRI Settings</Link>
          </div>
        </div>

        {/* Properties Tab */}
        {tab === 'properties' && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-5 mb-8">
              {[
                { label: 'Total Properties', value: '2', icon: '🏘️' },
                { label: 'Portfolio Value', value: '₹1.17 Cr', icon: '💰' },
                { label: 'Active Listings', value: '1', icon: '📢' },
              ].map((kpi) => (
                <div key={kpi.label} className="card flex items-center gap-4">
                  <div className="text-4xl">{kpi.icon}</div>
                  <div>
                    <div className="font-display text-3xl font-bold text-[var(--color-gold)]">{kpi.value}</div>
                    <div className="text-sm text-[var(--color-ink-muted)]">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* NFT Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {OWNED_PARCELS.map((p, i) => (
                <motion.div
                  key={p.ulpin}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="card relative overflow-hidden group"
                >
                  {/* Background */}
                  <div className="h-44 bg-gradient-to-br from-[var(--color-gold)] via-[var(--color-gold-light)] to-yellow-400 rounded-lg mb-4 flex items-end justify-between p-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 text-9xl flex items-center justify-center">🏞️</div>
                    <div className="relative z-10">
                      <div className="font-mono text-xs text-yellow-100 mb-1">Token #{p.tokenId}</div>
                      <h3 className="font-display text-xl font-bold text-white">{p.area}</h3>
                      <p className="text-yellow-100 text-sm">{p.district}</p>
                    </div>
                    <span className="badge badge-success relative z-10">{p.status === 'CLEAR' ? 'Clear Title' : p.status}</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-bold text-xl text-[var(--color-ink)]">{p.value}</div>
                      <div className="text-xs text-[var(--color-ink-faint)] font-mono">ULPIN: {p.ulpin.slice(-6)}</div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {p.listed ? (
                        <span className="badge badge-warning">Listed for Sale</span>
                      ) : (
                        <span className="badge badge-pending">Not Listed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/parcel/${p.ulpin}`} className="btn btn-secondary btn-sm flex-1">View Details</Link>
                    <button className="btn btn-primary btn-sm flex-1">
                      {p.listed ? 'Manage Listing' : 'List for Sale'}
                    </button>
                    <button className="btn btn-ghost btn-sm">📄 Certificate</button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Active Transactions Tab */}
        {tab === 'active' && (
          <div className="space-y-5">
            {ACTIVE_TX.map((tx) => (
              <div key={tx.saleId} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display text-xl font-semibold">{tx.saleId}</h3>
                      <span className="badge badge-warning">In Progress</span>
                    </div>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      ULPIN: <span className="font-mono">{tx.ulpin}</span> · Buyer: {tx.buyer} · {tx.price}
                    </p>
                  </div>
                  <div className="text-xs text-[var(--color-ink-faint)]">Started {tx.startedOn}</div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[var(--color-ink-muted)] mb-2">
                    {['Offer', 'Agreement', 'e-Sign', 'Payment', 'Gov Review', 'Complete'].map((s, i) => (
                      <span key={s} className={`${i + 1 === tx.step ? 'text-[var(--color-gold)] font-medium' : ''}`}>{s}</span>
                    ))}
                  </div>
                  <StepBar current={tx.step} total={7} />
                </div>

                <div className="p-3 bg-[var(--color-warning-light)] rounded-lg text-sm text-[var(--color-warning)]">
                  ⏳ <strong>Current Status:</strong> {tx.stepLabel} — Submitted to Sub-Registrar Office, Patna. Queue position: 3. Est. 2 business days.
                </div>

                <div className="flex gap-3 mt-4">
                  <button className="btn btn-secondary btn-sm">View Full Details</button>
                  <button className="btn btn-ghost btn-sm">Upload Documents</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction History Tab */}
        {tab === 'transactions' && (
          <div className="card p-0 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ULPIN</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Blockchain Record</th>
                </tr>
              </thead>
              <tbody>
                {TX_HISTORY.map((h, i) => (
                  <tr key={i}>
                    <td className="mono text-sm">{h.ulpin.slice(-6)}</td>
                    <td>
                      <span className={`badge ${h.type === 'Bought' ? 'badge-success' : 'badge-warning'}`}>{h.type}</span>
                    </td>
                    <td className="text-sm">{h.party}</td>
                    <td className="text-sm">{h.date}</td>
                    <td className="font-medium">{h.amount}</td>
                    <td>
                      <a href={`https://sepolia.etherscan.io/tx/${h.tx}`} target="_blank" rel="noopener noreferrer"
                        className="mono text-xs text-[var(--color-gold)] hover:underline">
                        {h.tx}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Document Vault Tab */}
        {tab === 'documents' && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📁</div>
            <h3 className="font-display text-2xl font-semibold mb-2">Document Vault</h3>
            <p className="text-[var(--color-ink-muted)] mb-6 max-w-md mx-auto">
              All your title deeds, NOCs, and certificates — stored securely on IPFS and linked to your DigiLocker.
            </p>
            <button className="btn btn-primary">Connect DigiLocker</button>
          </div>
        )}

        {/* Watchlist Tab */}
        {tab === 'watchlist' && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">👁</div>
            <h3 className="font-display text-2xl font-semibold mb-2">Your Watchlist</h3>
            <p className="text-[var(--color-ink-muted)] mb-6 max-w-md mx-auto">
              Save parcels you&apos;re interested in. Get price change and status alerts.
            </p>
            <Link href="/search" className="btn btn-primary">Browse Listings</Link>
          </div>
        )}
      </main>
    </div>
  )
}
