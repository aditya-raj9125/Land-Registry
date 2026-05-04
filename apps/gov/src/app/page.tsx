'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function GovHomePage() {
  const { address, isConnected } = useAccount()

  return (
    <div className="h-screen bg-[#050505] text-white overflow-hidden relative flex flex-col">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Navbar */}
      <nav className="h-20 border-b border-white/5 flex items-center justify-between px-12 shrink-0 relative z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center font-bold text-black shadow-[0_0_20px_rgba(184,134,11,0.3)]">B</div>
          <div>
            <h1 className="font-bold tracking-tight text-lg leading-none">BhoomiChain</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Official Government Portal</p>
          </div>
        </div>
        <ConnectButton />
      </nav>

      <main className="flex-1 flex items-center px-12 relative z-10">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="py-12"
          >
            <span className="inline-block px-4 py-1.5 bg-gold/10 text-gold text-[10px] font-bold uppercase tracking-widest rounded-full border border-gold/20 mb-6">
              Authenticated Access Only
            </span>
            <h2 className="text-5xl md:text-6xl font-display font-bold leading-[1.1] mb-6">
              Manage the National <br />
              <span className="text-gold">Land Registry.</span>
            </h2>
            <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-md">
              Official interface for Revenue Inspectors and Supervisors to verify, mint, and manage immutable land records on the blockchain.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/upload" className="px-8 py-4 bg-gold text-black font-bold rounded-2xl hover:bg-yellow-500 hover:scale-[1.02] transition-all flex items-center gap-3">
                <span>➕</span> New Parcel Upload
              </Link>
              <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-medium">
                View All Records
              </button>
            </div>
          </motion.div>

          {/* Right: Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="w-full aspect-square max-w-[440px] ml-auto rounded-[40px] bg-gradient-to-br from-gold/10 to-transparent border border-white/10 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="text-[140px] filter drop-shadow-[0_0_50px_rgba(184,134,11,0.3)]">🏛️</div>
              
              {/* Floating UI Elements */}
              <div className="absolute top-10 left-10 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 animate-bounce">
                <div className="flex gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>
                <div className="w-20 h-1.5 bg-white/10 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Fixed Bottom Bar for Stats & Footer */}
      <footer className="h-32 border-t border-white/5 bg-black/50 backdrop-blur-xl px-12 flex flex-col justify-center shrink-0 relative z-20">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-3 gap-12 mb-6">
            <div>
              <p className="text-2xl font-bold text-white">1.2s</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Block Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0.0%</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Forgery Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gold">Sepolia</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Network</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-[9px] text-white/20 uppercase tracking-[0.25em]">
            <span>Digital India Initiative</span>
            <span>Secure Protocol v2.4.1</span>
            <span>Ministry of Land & Revenue</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
