import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Geist Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        bangla: ['"Hind Siliguri"', 'sans-serif'],
      },
      colors: {
        bg: 'hsl(var(--bg))',
        surface: 'hsl(var(--surface))',
        elevated: 'hsl(var(--elevated))',
        border: 'hsl(var(--border))',
        ink: 'hsl(var(--ink))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))',
        'accent-fg': 'hsl(var(--accent-fg))',
        rose: 'hsl(var(--rose))',
        amber: 'hsl(var(--amber))',
        success: 'hsl(var(--success))',
        danger: 'hsl(var(--danger))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms ease-out',
        'slide-up': 'slide-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
