'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: 1200 })
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [isInView, motionValue, value])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent =
          Intl.NumberFormat('en-IN').format(Math.floor(latest)) + suffix
      }
    })
  }, [springValue, suffix])

  return <span ref={ref}>0{suffix}</span>
}

// ── India Map SVG placeholder ─────────────────────────────────────
function InteractiveFeatureHub() {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const features = [
    { title: 'Immutable Ledger', desc: 'Tamper-proof records on Ethereum Sepolia.', icon: '🛡️', color: 'gold' },
    { title: 'Real-time Sync', desc: 'Instant updates across all national nodes.', icon: '⚡', color: 'success' },
    { title: 'Fraud Prevention', desc: 'AI-driven dispute and forgery detection.', icon: '🚫', color: 'error' },
    { title: 'Global Access', desc: 'Secure verification for NRIs worldwide.', icon: '🌐', color: 'info' }
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-12">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gold/5 blur-[100px] rounded-full animate-pulse pointer-events-none" />
      
      <div className="grid grid-cols-2 gap-4 relative z-10 w-full max-w-[500px]">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative bg-surface/40 backdrop-blur-xl border border-gold/10 rounded-3xl p-6 shadow-xl hover:border-gold/30 hover:shadow-gold/5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-3xl mb-4 transform group-hover:scale-110 transition-transform">{f.icon}</div>
            <h3 className="font-display text-lg font-bold text-ink mb-1">{f.title}</h3>
            <p className="text-[10px] leading-relaxed text-ink-muted uppercase tracking-wider">{f.desc}</p>
            <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
              <div className="absolute top-[-24px] right-[-24px] w-12 h-12 bg-gold/10 rotate-45 group-hover:bg-gold/20 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating security particles — Only on Client */}
      {isMounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -100, 0],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0, 0.4, 0]
              }}
              transition={{ 
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              className="absolute w-1 h-1 bg-gold rounded-full"
              style={{ 
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
      )}

      {/* Center Connection Circle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] h-[300px] border border-gold/5 rounded-full animate-[spin_20s_linear_infinite]" />
        <div className="absolute w-[240px] h-[240px] border border-dashed border-gold/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
      </div>
    </div>
  )
}



// ── Stat Bar Item ─────────────────────────────────────────────────
function StatItem({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="text-center px-8 py-6 border-r border-yellow-600 last:border-r-0">
      <div className="font-display text-3xl font-bold text-white mb-1">
        <AnimatedCounter value={value} suffix={suffix || ''} />
      </div>
      <div className="text-yellow-200 text-sm font-medium uppercase tracking-wider">{label}</div>
    </div>
  )
}

// ── How It Works Step ─────────────────────────────────────────────
function HowItWorksStep({
  num, icon, title, desc, delay
}: {
  num: number; icon: string; title: string; desc: string; delay: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="card text-center p-10 flex flex-col items-center gap-4"
    >
      <div className="w-20 h-20 rounded-full bg-[var(--color-gold-pale)] border-2 border-[var(--color-gold)] flex items-center justify-center text-4xl">
        {icon}
      </div>
      <div className="w-8 h-8 rounded-full bg-[var(--color-gold)] text-white flex items-center justify-center text-sm font-bold -mt-2">
        {num}
      </div>
      <h3 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
      <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Benefit Card ──────────────────────────────────────────────────
function BenefitCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="card hover:border-[var(--color-gold)] transition-all duration-200 p-6 text-center"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h4 className="font-display text-lg font-semibold text-[var(--color-ink)] mb-2">{title}</h4>
      <p className="text-[var(--color-ink-muted)] text-sm leading-relaxed">{desc}</p>
    </motion.div>
  )
}

// ── Featured Parcel Card ──────────────────────────────────────────
function ParcelCard({ ulpin, area, district, price, status }: {
  ulpin: string; area: string; district: string; price: string; status: 'CLEAR' | 'PENDING'
}) {
  return (
    <div className="card min-w-[280px] flex flex-col gap-3 cursor-pointer hover:border-[var(--color-gold)] transition-all">
      <div className="w-full h-40 bg-gradient-to-br from-[var(--color-cream-dark)] to-[var(--color-gold-pale)] rounded-lg flex items-center justify-center relative overflow-hidden">
        <div className="text-6xl opacity-20">🏞️</div>
        <div className="absolute top-3 right-3">
          <span className={`badge ${status === 'CLEAR' ? 'badge-success' : 'badge-warning'} text-xs`}>
            {status === 'CLEAR' ? 'Clear Title' : 'Pending'}
          </span>
        </div>
      </div>
      <div>
        <p className="font-mono text-xs text-[var(--color-ink-faint)] mb-1">...{ulpin.slice(-6)}</p>
        <h4 className="font-display text-lg font-semibold text-[var(--color-ink)]">{area}</h4>
        <p className="text-sm text-[var(--color-ink-muted)]">📍 {district}</p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-border)]">
        <div>
          <div className="font-bold text-[var(--color-ink)]">{price}</div>
          <div className="text-xs text-[var(--color-ink-faint)]">Asking Price</div>
        </div>
        <Link href={`/parcel/${ulpin}`} className="btn btn-primary btn-sm">
          View Details
        </Link>
      </div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef(null)

  const featuredParcels = [
    { ulpin: '14010100000001', area: '2.4 Acres Agricultural', district: 'Patna, Bihar', price: '₹32,00,000', status: 'CLEAR' as const },
    { ulpin: '27020200000042', area: '1,200 sq.ft Residential Plot', district: 'Pune, Maharashtra', price: '₹85,00,000', status: 'CLEAR' as const },
    { ulpin: '09030100000108', area: '5.1 Acres Farm Land', district: 'Lucknow, Uttar Pradesh', price: '₹18,50,000', status: 'CLEAR' as const },
    { ulpin: '33040100000215', area: '800 sq.ft Villa Plot', district: 'Chennai, Tamil Nadu', price: '₹1,20,00,000', status: 'PENDING' as const },
    { ulpin: '07010100000319', area: '3.8 Acres Agricultural', district: 'Jaipur, Rajasthan', price: '₹45,00,000', status: 'CLEAR' as const },
    { ulpin: '19020200000427', area: '1,500 sq.ft Residential', district: 'Kolkata, West Bengal', price: '₹65,00,000', status: 'CLEAR' as const },
  ]

  return (
    <div className="bg-[var(--color-cream)]">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-gold)] rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold font-display">B</span>
            </div>
            <span className="font-display text-xl font-bold text-[var(--color-ink)]">BhoomiChain</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)] transition-colors">Search Land</Link>
            <Link href="/map" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)] transition-colors">Map View</Link>
            <Link href="/public/data" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)] transition-colors">Verify Property</Link>
            <Link href="/nri" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)] transition-colors">NRI Services</Link>
          </div>

          <div className="flex items-center gap-3">
            <ConnectButton
              label="Connect Wallet"
              accountStatus="avatar"
              chainStatus="icon"
            />
            <Link href="/dashboard" className="btn btn-primary btn-sm">My Properties</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        ref={heroRef}
        className="relative h-[calc(100vh-80px)] flex items-center dot-grid-bg overflow-hidden"
        style={{ background: `var(--color-cream)` }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full h-full">

          {/* Left: Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center"
          >
            {/* Government badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-[var(--color-gold-pale)] border border-[var(--color-gold)] rounded-full px-3 py-1.5 mb-6 w-fit"
            >
              <span className="text-sm">🏛️</span>
              <span className="text-[11px] font-bold text-[var(--color-gold)] uppercase tracking-wider">
                National Blockchain Land Registry
              </span>
            </motion.div>

            <h1 className="font-display text-5xl xl:text-7xl font-bold leading-[1.1] mb-4">
              <span className="text-[var(--color-ink)]">YOUR LAND,</span>
              <br />
              <span className="text-[var(--color-ink)]">FOREVER</span>
              <br />
              <span className="italic text-[var(--color-gold)]">YOURS.</span>
            </h1>

            <p className="text-[var(--color-ink-muted)] text-base leading-relaxed mb-8 max-w-md">
              India&apos;s first tamper-proof land registry. Every title certificate lives on a permanent, immutable record — impossible to forge or steal.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Link href="/search" className="btn btn-primary">
                Search Land Records
              </Link>
              <Link href="/public/data" className="btn btn-secondary">
                Verify a Property
              </Link>
            </div>

            {/* Trust indicators — Scaled down for one-page fit */}
            <div className="flex flex-wrap gap-6 pt-6 border-t border-[var(--color-border)]">
              <div>
                <div className="font-display text-xl font-bold text-[var(--color-gold)]">
                  <AnimatedCounter value={2_47_891} />
                </div>
                <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Parcels On-Chain</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold text-[var(--color-gold)]">
                  <AnimatedCounter value={18} />
                </div>
                <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">States Connected</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold text-[var(--color-gold)]">
                  ₹<AnimatedCounter value={4821} suffix=" Cr" />
                </div>
                <div className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide">Revenue Secured</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Interactive Feature Hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-[480px] hidden lg:block"
          >
            <InteractiveFeatureHub />
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-[var(--color-gold)]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-yellow-600">
            <StatItem value={2_47_891} label="Parcels On-Chain" />
            <StatItem value={18} label="States Connected" />
            <StatItem value={3_421} label="Disputes Prevented" />
            <StatItem value={24} label="Hrs Avg Transaction" suffix=" hrs" />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title text-4xl mb-4">How BhoomiChain Works</h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              Three simple steps replace decades of paperwork, middlemen, and uncertainty. Your property title — secured forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <HowItWorksStep
              num={1}
              icon="🏛️"
              title="Government Verifies"
              desc="Revenue officers upload land records with GPS boundary data, ownership history, and legal documents. Supervisor approval required — dual OTP sign-off."
              delay={0}
            />
            <HowItWorksStep
              num={2}
              icon="🤝"
              title="You Transact On-Chain"
              desc="Buyer and seller agree on price. Stamp duty is auto-calculated and paid. The smart contract holds funds in escrow. Government approves digitally — no physical visit needed."
              delay={0.15}
            />
            <HowItWorksStep
              num={3}
              icon="🔐"
              title="Title Is Yours Forever"
              desc="Your Digital Title Certificate is issued instantly. It cannot be disputed, forged, or stolen. Scan the QR code — it points to the permanent record on the national registry."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ── Featured Listings ── */}
      <section className="py-20 bg-[var(--color-cream-dark)]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="section-title text-3xl mb-2">Featured Listings</h2>
              <p className="text-[var(--color-ink-muted)]">Verified parcels with clear title — ready for transfer.</p>
            </div>
            <Link href="/search" className="btn btn-secondary">View All →</Link>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 snap-x">
            {featuredParcels.map((p) => (
              <div key={p.ulpin} className="snap-start">
                <ParcelCard {...p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why BhoomiChain ── */}
      <section className="py-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title text-4xl mb-4">Why BhoomiChain?</h2>
            <p className="section-subtitle max-w-xl mx-auto">
              Land disputes cost India 20 years of courtroom battles per case. We&apos;ve eliminated the root causes — one permanent record at a time.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: '🛡️', title: 'Zero Fraud', desc: 'Forgery is mathematically impossible on an immutable record.', delay: 0 },
              { icon: '⚡', title: 'Instant Verify', desc: 'Title verification in seconds — not weeks of manual search.', delay: 0.1 },
              { icon: '🚫', title: 'No Middlemen', desc: 'No sub-registrar bribe. No stamp paper vendor. No delays.', delay: 0.2 },
              { icon: '🕐', title: '24-Hour Deed', desc: 'Complete registration in 24 hours. Any time. Any device.', delay: 0.3 },
              { icon: '✈️', title: 'NRI Safe', desc: 'Sell or monitor your property from anywhere in the world.', delay: 0.4 },
            ].map((b) => (
              <BenefitCard key={b.title} {...b} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Limited Time Banner ── */}
      <section className="bg-[var(--color-gold)] py-14 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-600/30 rounded-full px-4 py-1 mb-4">
            <span className="text-yellow-200 text-sm font-medium uppercase tracking-wider">Limited Offer</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            First 1,00,000 Registrations
          </h2>
          <p className="text-yellow-100 text-xl mb-8">
            Zero Platform Fee — Save ₹5,000 on your property registration today.
          </p>
          <Link href="/search" className="btn btn-lg" style={{ background: 'white', color: 'var(--color-gold)' }}>
            Register Your Property Now
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[var(--color-ink)] text-white py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-[var(--color-gold)] rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold font-display">B</span>
                </div>
                <span className="font-display text-xl font-bold">BhoomiChain</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Own It Forever. On The Blockchain.<br />
                India&apos;s National Blockchain Land Registry System.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-[var(--color-gold)] transition-colors">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-[var(--color-gold)] transition-colors">LinkedIn</a>
                <a href="#" className="text-gray-400 hover:text-[var(--color-gold)] transition-colors">GitHub</a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-white uppercase tracking-wider text-sm">Quick Links</h4>
              <div className="space-y-3">
                {[
                  ['Search Land Records', '/search'],
                  ['Map View', '/map'],
                  ['Verify Property', '/public/data'],
                  ['NRI Services', '/nri'],
                  ['Grievance Portal', '/grievance'],
                  ['Government Login', '/gov'],
                ].map(([label, href]) => (
                  <div key={href}>
                    <Link href={href} className="text-gray-400 hover:text-[var(--color-gold)] text-sm transition-colors">
                      {label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-white uppercase tracking-wider text-sm">Help & Support</h4>
              <div className="space-y-3 text-sm text-gray-400">
                <p>📞 Helpline: <span className="text-white font-mono">1800-XXX-XXXX</span> (Toll Free)</p>
                <p>📧 support@bhoomichain.in</p>
                <p>📍 Ministry of Housing & Urban Affairs,<br />New Delhi — 110001</p>
                <p className="pt-3">
                  <Link href="/grievance" className="text-[var(--color-gold)] hover:underline">
                    File a Grievance →
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>🏛️</span>
              <span>Government of India — Operated under the IT Act 2000 and Registration Act 1908</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2025 BhoomiChain. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
