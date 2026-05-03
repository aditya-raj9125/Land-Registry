import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | BhoomiChain',
    default: 'BhoomiChain — Own It Forever. On The Blockchain.',
  },
  description:
    'India\'s national blockchain land registry. Every land record, every transaction, every ownership certificate — immutable and fraud-proof.',
  keywords: [
    'land registry',
    'India land records',
    'blockchain property',
    'land title verification',
    'digital title certificate',
    'ULPIN',
    'bhu-aadhaar',
    'property registration',
  ],
  authors: [{ name: 'BhoomiChain — Government of India' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://bhoomichain.in',
    siteName: 'BhoomiChain',
    title: 'BhoomiChain — Own It Forever. On The Blockchain.',
    description: 'India\'s tamper-proof national land registry. Verify, buy, and own property — secured forever on a permanent record.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BhoomiChain — India\'s Blockchain Land Registry',
    description: 'Every land record on an immutable, permanent record.',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#B8860B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
