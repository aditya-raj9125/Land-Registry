'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell
} from 'recharts'
import Link from 'next/link'

const TRANSACTION_DATA = [
  { month: 'Jun', Maharashtra: 4200, Karnataka: 2800, UP: 3100, Delhi: 1900, Others: 5200 },
  { month: 'Jul', Maharashtra: 4800, Karnataka: 3100, UP: 3400, Delhi: 2100, Others: 5800 },
  { month: 'Aug', Maharashtra: 4400, Karnataka: 2900, UP: 3200, Delhi: 2000, Others: 5500 },
  { month: 'Sep', Maharashtra: 5200, Karnataka: 3400, UP: 3800, Delhi: 2400, Others: 6100 },
  { month: 'Oct', Maharashtra: 5800, Karnataka: 3700, UP: 4100, Delhi: 2700, Others: 6800 },
  { month: 'Nov', Maharashtra: 4900, Karnataka: 3200, UP: 3500, Delhi: 2300, Others: 5900 },
  { month: 'Dec', Maharashtra: 5300, Karnataka: 3500, UP: 3900, Delhi: 2500, Others: 6300 },
  { month: 'Jan', Maharashtra: 6100, Karnataka: 3900, UP: 4400, Delhi: 2900, Others: 7100 },
  { month: 'Feb', Maharashtra: 5700, Karnataka: 3600, UP: 4100, Delhi: 2700, Others: 6700 },
  { month: 'Mar', Maharashtra: 6800, Karnataka: 4200, UP: 4800, Delhi: 3100, Others: 7800 },
  { month: 'Apr', Maharashtra: 7200, Karnataka: 4500, UP: 5100, Delhi: 3300, Others: 8200 },
  { month: 'May', Maharashtra: 7500, Karnataka: 4700, UP: 5300, Delhi: 3500, Others: 8600 },
]

const STAMP_DUTY_DATA = [
  { state: 'Maharashtra', actual: 842, target: 900, leakage: 58 },
  { state: 'Karnataka', actual: 631, target: 680, leakage: 49 },
  { state: 'Uttar Pradesh', actual: 579, target: 650, leakage: 71 },
  { state: 'Delhi', actual: 412, target: 420, leakage: 8 },
  { state: 'Tamil Nadu', actual: 387, target: 410, leakage: 23 },
  { state: 'Rajasthan', actual: 298, target: 350, leakage: 52 },
  { state: 'Gujarat', actual: 456, target: 470, leakage: 14 },
  { state: 'West Bengal', actual: 312, target: 380, leakage: 68 },
  { state: 'Telangana', actual: 289, target: 310, leakage: 21 },
  { state: 'Punjab', actual: 198, target: 230, leakage: 32 },
]

const DISPUTE_FUNNEL = [
  { name: 'Filed', value: 12840, fill: '#C0392B' },
  { name: 'District Court', value: 8240, fill: '#D68910' },
  { name: 'High Court', value: 2190, fill: '#B8860B' },
  { name: 'Supreme Court', value: 340, fill: '#1E8449' },
  { name: 'Resolved', value: 4890, fill: '#1A5276' },
]

const BENAMI_ALERTS = [
  { type: 'Rapid Resale', ulpin: '27020200000042', date: '01/05/2025', status: 'PENDING' },
  { type: 'Below Circle Rate', ulpin: '09030100000108', date: '28/04/2025', status: 'CLEARED' },
  { type: 'Single Aadhaar — Too Many Parcels', ulpin: '33040100000215', date: '25/04/2025', status: 'ESCALATED' },
  { type: 'Rapid Resale', ulpin: '07010100000319', date: '22/04/2025', status: 'PENDING' },
]

function StatCard({ label, value, trend, unit = '', icon }: {
  label: string; value: string; trend?: number; unit?: string; icon: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      className="card-glass p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="font-display text-3xl font-bold text-white">{value}</div>
      <div className="text-yellow-200 text-sm mt-1">{label}</div>
    </motion.div>
  )
}

export default function NationalDashboard() {
  const [activeTab, setActiveTab] = useState<'national' | 'district' | 'bank' | 'public'>('national')

  return (
    <div className="min-h-screen bg-[var(--color-ink)]">

      {/* Header */}
      <header className="bg-[var(--color-gold)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display text-xl font-bold text-white">BhoomiChain</Link>
          <span className="text-yellow-200 text-sm">Analytics Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-yellow-100 text-sm">Ministry of Housing & Urban Affairs</span>
          <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-sm font-bold">M</div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-[var(--color-ink)] border-b border-gray-700 px-6">
        <div className="flex gap-1">
          {[
            { id: 'national', label: '🏛️ National Overview' },
            { id: 'district', label: '🗺️ District / Revenue' },
            { id: 'bank', label: '🏦 Bank / NBFC' },
            { id: 'public', label: '👥 Public Data' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">

        {/* National Overview */}
        {activeTab === 'national' && (
          <div className="space-y-6">

            {/* Choropleth Map Placeholder */}
            <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 h-64 flex items-center justify-center relative">
              <div className="text-center">
                <div className="text-5xl mb-3">🇮🇳</div>
                <p className="text-gray-400 text-sm">National Transaction Heatmap — Mapbox choropleth</p>
                <p className="text-gray-500 text-xs mt-1">States colored by monthly transaction volume</p>
              </div>
              {/* District-level bars (illustrative) */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-1">
                {['Bihar', 'UP', 'MP', 'MH', 'GJ', 'KA', 'TN', 'AP'].map((s, i) => (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${20 + (i * 7) % 40}px`,
                        background: `rgba(184, 134, 11, ${0.3 + (i * 0.08) % 0.5})`,
                      }}
                    />
                    <span className="text-gray-500 text-[10px]">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon="📊" label="Total Parcels On-Chain" value="2,47,891" trend={12} />
              <StatCard icon="🔄" label="Active Transactions" value="1,284" trend={8} />
              <StatCard icon="💰" label="Stamp Duty (₹ Cr)" value="4,821" trend={23} />
              <StatCard icon="⚖️" label="Disputes This Month" value="342" trend={-5} />
              <StatCard icon="⏱️" label="Avg Completion (hrs)" value="18.4" trend={-12} />
              <StatCard icon="🏛️" label="States Live" value="18" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

              {/* Transaction Volume Area Chart */}
              <div className="xl:col-span-2 bg-gray-900 border border-gray-700 rounded-xl p-5">
                <h3 className="font-display text-lg font-semibold text-white mb-4">
                  Transaction Volume — 12 Months
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={TRANSACTION_DATA}>
                    <defs>
                      <linearGradient id="mhGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B8860B" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#aaa' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#aaa' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="Maharashtra" stroke="#B8860B" fill="url(#mhGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Karnataka" stroke="#DAA520" fillOpacity={0} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="UP" stroke="#C0392B" fillOpacity={0} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="Delhi" stroke="#1E8449" fillOpacity={0} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Dispute Funnel */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <h3 className="font-display text-lg font-semibold text-white mb-4">Dispute Pipeline</h3>
                <div className="space-y-2">
                  {DISPUTE_FUNNEL.map((d) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{d.name}</span>
                        <span className="text-white font-mono">{d.value.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-5 rounded-sm overflow-hidden bg-gray-800">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${(d.value / 12840) * 100}%`,
                            backgroundColor: d.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stamp Duty vs Target */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="font-display text-lg font-semibold text-white mb-4">
                Stamp Duty Collection vs Target (₹ Crores)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={STAMP_DUTY_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#aaa' }} tickFormatter={(v) => `${v}Cr`} />
                  <YAxis dataKey="state" type="category" tick={{ fontSize: 11, fill: '#aaa' }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
                    formatter={(v: number, name: string) => [`₹${v} Cr`, name === 'actual' ? 'Collected' : 'Target']}
                  />
                  <Bar dataKey="target" fill="#333" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="actual" fill="var(--color-gold)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Benami Alerts */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="font-display text-lg font-semibold text-white mb-4">
                🚨 AI Benami Alert Panel
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="text-xs text-gray-400 pb-3 uppercase tracking-wider">Alert Type</th>
                    <th className="text-xs text-gray-400 pb-3 uppercase tracking-wider">ULPIN</th>
                    <th className="text-xs text-gray-400 pb-3 uppercase tracking-wider">Flagged</th>
                    <th className="text-xs text-gray-400 pb-3 uppercase tracking-wider">Status</th>
                    <th className="text-xs text-gray-400 pb-3 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {BENAMI_ALERTS.map((a, i) => (
                    <tr key={i}>
                      <td className="py-3 text-sm text-gray-200">{a.type}</td>
                      <td className="py-3 font-mono text-xs text-gray-400">{a.ulpin.slice(-6)}</td>
                      <td className="py-3 text-sm text-gray-400">{a.date}</td>
                      <td className="py-3">
                        <span className={`badge text-xs ${
                          a.status === 'PENDING' ? 'badge-warning' :
                          a.status === 'ESCALATED' ? 'badge-danger' : 'badge-success'
                        }`}>{a.status}</span>
                      </td>
                      <td className="py-3">
                        <button className="text-xs text-[var(--color-gold)] hover:underline">Review →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* District Tab */}
        {activeTab === 'district' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="font-display text-lg font-semibold text-white mb-4">
                📋 Pending Approval Queue — Patna District
              </h3>
              <table className="w-full">
                <thead>
                  <tr>
                    {['Token ID', 'Location', 'Sale Amount', 'Stamp Duty', 'Days Waiting', 'Action'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 pb-3 uppercase tracking-wider px-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { id: '#001', loc: 'Maner, Patna', sale: '₹32,00,000', duty: '₹1,92,000', days: 1 },
                    { id: '#042', loc: 'Danapur, Patna', sale: '₹48,00,000', duty: '₹2,88,000', days: 3 },
                    { id: '#108', loc: 'Phulwari, Patna', sale: '₹21,50,000', duty: '₹1,29,000', days: 8 },
                  ].map((row) => (
                    <tr key={row.id} className={row.days >= 7 ? 'bg-red-900/10' : ''}>
                      <td className="py-3 px-3 font-mono text-sm text-gray-300">{row.id}</td>
                      <td className="py-3 px-3 text-sm text-gray-200">{row.loc}</td>
                      <td className="py-3 px-3 text-sm text-white font-medium">{row.sale}</td>
                      <td className="py-3 px-3 text-sm text-gray-300">{row.duty}</td>
                      <td className={`py-3 px-3 text-sm font-medium ${row.days >= 7 ? 'text-red-400' : 'text-gray-300'}`}>{row.days}d</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <button className="btn btn-primary btn-sm text-xs">Approve</button>
                          <button className="btn btn-ghost btn-sm text-xs text-gray-300">Query</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-5">
              <StatCard icon="🏠" label="Mortgaged Parcels" value="4,218" />
              <StatCard icon="⚠️" label="High-Risk (LTV >80%)" value="127" trend={-3} />
              <StatCard icon="🔴" label="Collateral Alerts" value="8" trend={15} />
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="font-display text-lg font-semibold text-white mb-4">
                🗺️ Portfolio Risk Map
              </h3>
              <div className="h-48 flex items-center justify-center text-gray-500 border border-gray-700 rounded-lg">
                Mapbox GL map showing mortgaged parcels colored by LTV risk tier
              </div>
            </div>
          </div>
        )}

        {/* Public Tab */}
        {activeTab === 'public' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="font-display text-xl font-semibold text-white mb-2">Public Parcel Lookup</h3>
              <p className="text-gray-400 text-sm mb-4">Enter any ULPIN to check title status — no login required.</p>
              <div className="flex gap-3">
                <input type="text" placeholder="Enter 14-digit ULPIN..." className="input bg-gray-800 border-gray-700 text-white flex-1" />
                <button className="btn btn-primary">Search</button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h3 className="font-display text-lg font-semibold text-white mb-4">
                🏛️ Government Land Auction Calendar
              </h3>
              <p className="text-gray-400 text-sm mb-4">Upcoming auctions of government land parcels.</p>
              <div className="space-y-3">
                {[
                  { date: '15/05/2025', loc: 'Noida, UP', area: '5 Acres', reserve: '₹2.1 Cr', status: 'Open' },
                  { date: '22/05/2025', loc: 'Bengaluru, KA', area: '2,400 sq.ft', reserve: '₹1.8 Cr', status: 'Open' },
                  { date: '01/06/2025', loc: 'Hyderabad, TS', area: '3.2 Acres', reserve: '₹3.4 Cr', status: 'Upcoming' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                    <div className="text-center bg-[var(--color-gold)] rounded-lg p-2 min-w-[56px]">
                      <div className="text-white text-xs">{a.date.split('/')[1]}/{a.date.split('/')[2]}</div>
                      <div className="text-white font-bold text-lg leading-none">{a.date.split('/')[0]}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{a.loc}</div>
                      <div className="text-gray-400 text-xs">{a.area} · Reserve: {a.reserve}</div>
                    </div>
                    <span className={`badge ${a.status === 'Open' ? 'badge-success' : 'badge-pending'}`}>{a.status}</span>
                    <button className="btn btn-secondary btn-sm text-xs">Register to Bid</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
