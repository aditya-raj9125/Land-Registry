import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B8860B',
          light: '#DAA520',
          pale: '#FFF8E7',
        },
        vermilion: {
          DEFAULT: '#C0392B',
          light: '#E74C3C',
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
        border: {
          DEFAULT: '#E8D5B0',
          strong: '#C4A87A',
        },
        government: '#1A5276',
        forest: '#145A32',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(184, 134, 11, 0.1)',
        'card-hover': '0 4px 20px rgba(184, 134, 11, 0.15)',
        gold: '0 0 0 2px rgba(184, 134, 11, 0.3)',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up': 'count-up 1.2s ease-out forwards',
        'ripple': 'ripple 0.6s linear',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-right': 'slide-right 0.3s ease-out',
        'stamp-seal': 'stamp-seal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(192, 57, 43, 0.4)' },
          '70%': { boxShadow: '0 0 0 12px rgba(192, 57, 43, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'stamp-seal': {
          '0%': { transform: 'scale(0.5) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(1.05) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #C4A87A 1px, transparent 1px)',
        'gold-gradient': 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
        'cream-gradient': 'linear-gradient(180deg, #FDF8F0 0%, #F5EDD8 100%)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
    },
  },
  plugins: [],
}

export default config
