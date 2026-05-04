'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const MOCK_PARCELS = [
  { ulpin: '14010100000001', khasra: 'K-456/B', area: '2.4 Acres', areaUnit: 'agricultural', district: 'Patna', state: 'Bihar', price: '₹32,00,000', status: 'CLEAR', type: 'Agricultural', listed: '12/04/2025' },
  { ulpin: '27020200000042', khasra: 'S-1122', area: '1,200 sq.ft', areaUnit: 'residential', district: 'Pune', state: 'Maharashtra', price: '₹85,00,000', status: 'CLEAR', type: 'Residential', listed: '28/03/2025' },
  { ulpin: '09030100000108', khasra: 'K-89/A', area: '5.1 Acres', areaUnit: 'agricultural', district: 'Lucknow', state: 'Uttar Pradesh', price: '₹18,50,000', status: 'CLEAR', type: 'Agricultural', listed: '01/05/2025' },
  { ulpin: '33040100000215', khasra: 'T-2301', area: '800 sq.ft', areaUnit: 'residential', district: 'Chennai', state: 'Tamil Nadu', price: '₹1,20,00,000', status: 'PENDING', type: 'Residential', listed: '15/04/2025' },
  { ulpin: '07010100000319', khasra: 'K-7/C', area: '3.8 Acres', areaUnit: 'agricultural', district: 'Jaipur', state: 'Rajasthan', price: '₹45,00,000', status: 'CLEAR', type: 'Agricultural', listed: '22/04/2025' },
  { ulpin: '19020200000427', khasra: 'R-445', area: '1,500 sq.ft', areaUnit: 'residential', district: 'Kolkata', state: 'West Bengal', price: '₹65,00,000', status: 'CLEAR', type: 'Residential', listed: '08/05/2025' },
  { ulpin: '29050100000533', khasra: 'C-112', area: '2,400 sq.ft', areaUnit: 'commercial', district: 'Bengaluru', state: 'Karnataka', price: '₹3,50,00,000', status: 'ENCUMBERED', type: 'Commercial', listed: '05/04/2025' },
  { ulpin: '24060200000641', khasra: 'K-23', area: '8.2 Acres', areaUnit: 'agricultural', district: 'Ahmedabad', state: 'Gujarat', price: '₹72,00,000', status: 'DISPUTED', type: 'Agricultural', listed: '19/03/2025' },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    CLEAR: 'badge-success',
    PENDING: 'badge-warning',
    DISPUTED: 'badge-danger',
    ENCUMBERED: 'badge-danger',
    FROZEN: 'badge-danger',
  }
  const labels: Record<string, string> = {
    CLEAR: 'Clear Title',
    PENDING: 'Pending',
    DISPUTED: 'Disputed',
    ENCUMBERED: 'Encumbered',
    FROZEN: 'Frozen',
  }
  return <span className={`badge ${map[status] || 'badge-pending'}`}>{labels[status] || status}</span>
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [parcels, setParcels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    minArea: '',
    maxArea: '',
  })

  // Fetch live parcels from the API
  useEffect(() => {
    const fetchParcels = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:4000/api/parcels/search?q=${query}`)
        const data = await response.json()
        
        // Transform API data to match UI structure
        const liveParcels = data.map((p: any) => ({
          ulpin: p.ulpin,
          khasra: p.khasra_number || 'N/A',
          area: `${p.area_sqm || '0'} Sqm`,
          district: p.district_code || 'National',
          state: p.state_code || 'India',
          price: p.asking_price ? `₹${p.asking_price}` : 'Not Listed',
          status: p.title_status || 'CLEAR',
          type: p.land_type === 1 ? 'Residential' : 'Agricultural',
          listed: new Date(p.created_at).toLocaleDateString()
        }))

        // Combine live data with mock data (mock data only shows when query is empty)
        if (!query) {
          setParcels([...liveParcels, ...MOCK_PARCELS])
        } else {
          setParcels(liveParcels)
        }
      } catch (err) {
        console.error('Failed to fetch parcels:', err)
        setParcels(MOCK_PARCELS)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchParcels, 300)
    return () => clearTimeout(timer)
  }, [query])

  const filtered = parcels.filter((p) => {
    const matchType = filters.type === 'all' || p.type.toLowerCase() === filters.type
    const matchStatus = filters.status === 'all' || p.status === filters.status
    return matchType && matchStatus
  })

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">

      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] py-5 px-6 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <Link href="/" className="text-[var(--color-gold)] font-display font-bold text-xl mr-4">BhoomiChain</Link>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by ULPIN, Khasra number, owner name, village, district or pin code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input pl-10 py-3"
              id="search-input"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]">🔍</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('list')}
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            >
              ☰ List
            </button>
            <button
              onClick={() => setView('map')}
              className={`btn btn-sm ${view === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            >
              🗺 Map
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex gap-0">

        {/* Filters Sidebar */}
        <aside className="w-72 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] min-h-screen p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold">Filters</h3>
            <button
              className="text-xs text-[var(--color-gold)] hover:underline"
              onClick={() => setFilters({ type: 'all', status: 'all', minArea: '', maxArea: '' })}
            >
              Reset All
            </button>
          </div>

          {/* Land Type */}
          <div className="mb-6">
            <label className="label">Land Type</label>
            <select
              className="input text-sm"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="agricultural">Agricultural</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="forest">Forest</option>
              <option value="government">Government</option>
            </select>
          </div>

          {/* Title Status */}
          <div className="mb-6">
            <label className="label">Title Status</label>
            <div className="space-y-2">
              {['all', 'CLEAR', 'PENDING', 'DISPUTED', 'ENCUMBERED'].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={filters.status === s}
                    onChange={() => setFilters({ ...filters, status: s })}
                    className="accent-[var(--color-gold)]"
                  />
                  <span className="text-sm text-[var(--color-ink-muted)] capitalize">
                    {s === 'all' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Area Range */}
          <div className="mb-6">
            <label className="label">Area Range (Acres)</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" className="input text-sm py-2" value={filters.minArea}
                onChange={(e) => setFilters({ ...filters, minArea: e.target.value })} />
              <input type="number" placeholder="Max" className="input text-sm py-2" value={filters.maxArea}
                onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })} />
            </div>
          </div>

          <div className="p-3 bg-[var(--color-gold-pale)] rounded-lg border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-ink-muted)]">
              Showing <strong className="text-[var(--color-ink)]">{filtered.length}</strong> of{' '}
              <strong className="text-[var(--color-ink)]">{parcels.length}</strong> parcels
            </p>
          </div>
        </aside>

        {/* Main Results */}
        <main className="flex-1 p-6">
          {view === 'map' ? (
            <div className="h-[600px] bg-[var(--color-cream-dark)] rounded-xl border border-[var(--color-border)] flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">🗺️</div>
                <h3 className="font-display text-2xl font-semibold mb-2">Map View</h3>
                <p className="text-[var(--color-ink-muted)] mb-4">
                  Full Mapbox GL map with parcel polygons.
                </p>
                <Link href="/map" className="btn btn-primary">Open Full Map</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((parcel, i) => (
                <motion.div
                  key={parcel.ulpin}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card hover:border-[var(--color-gold)] transition-all group"
                >
                  <div className="h-36 bg-gradient-to-br from-[var(--color-cream-dark)] to-[var(--color-gold-pale)] rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="text-5xl opacity-20">
                      {parcel.type === 'Agricultural' ? '🌾' : parcel.type === 'Residential' ? '🏠' : '🏢'}
                    </div>
                    <div className="absolute top-2 right-2">{statusBadge(parcel.status)}</div>
                  </div>

                  <div className="mb-3">
                    <p className="font-mono text-xs text-[var(--color-ink-faint)] mb-1">
                      ULPIN: {parcel.ulpin.slice(0, 4)}...{parcel.ulpin.slice(-4)} | {parcel.khasra}
                    </p>
                    <h3 className="font-display text-xl font-semibold text-[var(--color-ink)] leading-tight">
                      {parcel.area} {parcel.type}
                    </h3>
                    <p className="text-sm text-[var(--color-ink-muted)] mt-1">
                      📍 {parcel.district}, {parcel.state}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                    <div>
                      <div className="font-bold text-[var(--color-ink)] text-lg">{parcel.price}</div>
                      <div className="text-xs text-[var(--color-ink-faint)]">Listed {parcel.listed}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/parcel/${parcel.ulpin}`} className="btn btn-secondary btn-sm">Details</Link>
                      <Link href={`/parcel/${parcel.ulpin}`} className="btn btn-primary btn-sm">Buy</Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
