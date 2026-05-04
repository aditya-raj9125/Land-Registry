'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { RainbowKitProvider, darkTheme, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect } from 'react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'bhoomichain'

const { connectors } = getDefaultWallets({
  appName: 'BhoomiChain Official',
  projectId,
  chains: [sepolia]
})

const config = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
  },
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#B8860B' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
