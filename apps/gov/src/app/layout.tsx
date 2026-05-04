import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '../components/providers'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
  title: 'BhoomiChain Official | Government of India',
  description: 'National Blockchain Land Registry — Official Management Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
