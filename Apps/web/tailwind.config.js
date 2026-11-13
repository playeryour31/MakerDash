/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: 'var(--destructive)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        brand: {
          DEFAULT: 'var(--brand)',
          soft: 'var(--brand-soft)',
          foreground: 'var(--brand-foreground)',
        },
        success: 'var(--success)',
        discord: 'var(--discord)',
        'chart-2': 'var(--chart-2)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1.05rem',
        '2xl': '1.35rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 28px -8px var(--accent-glow)',
        'glow-lg': '0 0 48px -10px rgba(91, 33, 182, 0.45)',
      },
      keyframes: {
        'ambient-drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-3%, 4%) scale(1.06)' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.85)' },
        },
      },
      animation: {
        'ambient-drift-slow': 'ambient-drift 24s ease-in-out infinite',
        'ambient-drift-slower': 'ambient-drift 32s ease-in-out infinite',
        'live-pulse': 'live-pulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};