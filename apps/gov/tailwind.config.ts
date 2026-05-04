import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B8860B',
          light: '#DAA520',
          pale: '#FFF8E7',
        },
        cream: {
          DEFAULT: '#FDF8F0',
          dark: '#F5EDD8',
        },
        ink: {
          DEFAULT: '#1A1A2E',
          muted: '#4A4A6A',
          faint: '#8A8AAA',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
