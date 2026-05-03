'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MapPage() {
  const [layers, setLayers] = useState({
    satellite: true,
    parcels: true,
    priceHeatmap: false,
    disputes: false,
    infrastructure: false,
    terrain3d: false,
  })
  const [selectedParcel, setSelectedParcel] = useState<null | {
    ulpin: string; area: string; district: string; status: string; price?: string
  }>(null)

  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search village, district, pin code, or ULPIN..."
            className="w-full bg-white/95 backdrop-blur border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-sm shadow-lg outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Layer Control Panel (top right) */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur rounded-xl border border-[var(--color-border)] p-4 shadow-lg w-64">
        <h3 className="font-display text-sm font-semibold text-[var(--color-ink)] mb-3">Map Layers</h3>
        <div className="space-y-2">
          {(Object.entries(layers) as [keyof typeof layers, boolean][]).map(([key, val]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--color-ink-muted)] capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/3d/, ' 3D')}
              </span>
              <button
                onClick={() => toggleLayer(key)}
                className={`w-10 h-5 rounded-full transition-colors relative ${val ? 'bg-[var(--color-gold)]' : 'bg-gray-200'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </label>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <h4 className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase mb-2">Legend</h4>
          <div className="space-y-1">
            {[
              { color: 'var(--color-success)', label: 'Clear Title' },
              { color: 'var(--color-warning)', label: 'Pending' },
              { color: 'var(--color-danger)', label: 'Disputed' },
              { color: 'var(--color-vermilion)', label: 'Encumbered' },
              { color: 'var(--color-government)', label: 'Government Land' },
              { color: 'var(--color-forest)', label: 'Forest / Restricted' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                <span className="text-xs text-[var(--color-ink-muted)]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Bar (left side) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        {[
          { icon: '✏️', label: 'Draw Boundary', id: 'draw' },
          { icon: '📏', label: 'Measure Distance', id: 'measure' },
          { icon: '📊', label: 'Price History', id: 'price' },
          { icon: '🔄', label: 'Boundary Compare', id: 'compare' },
          { icon: '📥', label: 'Export Map', id: 'export' },
        ].map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            className="w-10 h-10 bg-white/95 rounded-lg border border-[var(--color-border)] shadow flex items-center justify-center text-lg hover:bg-[var(--color-gold-pale)] hover:border-[var(--color-gold)] transition-all"
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Map Area */}
      <div
        className="w-full h-full bg-gradient-to-br from-green-900 via-green-700 to-yellow-800 flex items-center justify-center cursor-crosshair"
        onClick={() => setSelectedParcel({
          ulpin: '14010100000001',
          area: '2.4 Acres',
          district: 'Patna, Bihar',
          status: 'CLEAR',
          price: '₹32,00,000'
        })}
      >
        {/* Simulated parcels on map */}
        <div className="relative w-full h-full overflow-hidden">
          <div className="absolute inset-0 opacity-30 text-white flex items-center justify-center text-2xl">
            Mapbox GL JS v3 — satellite-streets style<br />
            <span className="text-sm opacity-60">Vector tiles from PostGIS/Martin tile server</span>
          </div>

          {/* Mock parcel polygons */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 700">
            {/* Clear title parcels */}
            <polygon points="200,200 300,180 320,280 220,300" fill="rgba(30, 132, 73, 0.35)" stroke="#1E8449" strokeWidth="1.5"
              className="cursor-pointer hover:fill-[rgba(30,132,73,0.5)]" />
            <polygon points="350,150 450,130 480,220 380,240" fill="rgba(30, 132, 73, 0.35)" stroke="#1E8449" strokeWidth="1.5" />
            <polygon points="500,250 620,230 640,340 520,360" fill="rgba(30, 132, 73, 0.35)" stroke="#1E8449" strokeWidth="1.5" />
            <polygon points="700,180 800,160 820,250 720,270" fill="rgba(30, 132, 73, 0.35)" stroke="#1E8449" strokeWidth="1.5" />
            <polygon points="850,300 950,280 970,380 870,400" fill="rgba(30, 132, 73, 0.35)" stroke="#1E8449" strokeWidth="1.5" />

            {/* Disputed parcel (pulsing) */}
            <polygon points="400,350 500,330 520,430 420,450" fill="rgba(146, 43, 33, 0.4)" stroke="#C0392B" strokeWidth="2"
              className="animate-pulse" />

            {/* Pending parcel */}
            <polygon points="600,400 700,380 720,480 620,500" fill="rgba(214, 137, 16, 0.3)" stroke="#D68910" strokeWidth="1.5" strokeDasharray="4,2" />

            {/* Government land */}
            <polygon points="150,380 260,360 280,460 170,480" fill="rgba(26, 82, 118, 0.35)" stroke="#1A5276" strokeWidth="1" />

            {/* ULPIN labels at high zoom */}
            <text x="240" y="250" fill="white" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle"
              className="pointer-events-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              140101...0001
            </text>
          </svg>
        </div>
      </div>

      {/* Parcel Detail Drawer (slides from right on desktop) */}
      {selectedParcel && (
        <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-[var(--color-border)] z-30 overflow-y-auto animate-slide-right">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold">Parcel Details</h3>
            <button onClick={() => setSelectedParcel(null)} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-xl">✕</button>
          </div>

          {/* Parcel Thumbnail */}
          <div className="h-48 bg-gradient-to-br from-green-700 to-green-500 relative">
            <div className="absolute bottom-3 left-3 right-3">
              <span className="badge badge-success">Clear Title</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <p className="font-mono text-xs text-[var(--color-ink-faint)]">ULPIN</p>
              <p className="font-mono text-sm font-medium">{selectedParcel.ulpin}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--color-ink-faint)] text-xs">Area</p>
                <p className="font-medium">{selectedParcel.area}</p>
              </div>
              <div>
                <p className="text-[var(--color-ink-faint)] text-xs">District</p>
                <p className="font-medium">{selectedParcel.district}</p>
              </div>
              <div>
                <p className="text-[var(--color-ink-faint)] text-xs">Asking Price</p>
                <p className="font-bold text-[var(--color-gold)]">{selectedParcel.price}</p>
              </div>
              <div>
                <p className="text-[var(--color-ink-faint)] text-xs">Last Transaction</p>
                <p className="font-medium">14/02/2024</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3">
              <Link href={`/parcel/${selectedParcel.ulpin}`} className="btn btn-primary w-full">
                Full Parcel Details
              </Link>
              <button className="btn btn-secondary w-full">Verify on Blockchain</button>
              <Link href="/grievance" className="btn btn-ghost w-full text-sm">Report an Issue</Link>
            </div>
          </div>
        </div>
      )}

      {/* Nav back link */}
      <Link href="/" className="absolute top-4 left-4 z-20 btn btn-ghost btn-sm bg-white/90 backdrop-blur shadow">
        ← BhoomiChain
      </Link>
    </div>
  )
}
