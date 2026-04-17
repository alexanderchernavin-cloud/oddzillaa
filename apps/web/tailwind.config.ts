import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-hover': 'rgb(var(--card-hover) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
      },
      keyframes: {
        'flash-up': {
          '0%': { backgroundColor: 'rgb(34 197 94 / 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-down': {
          '0%': { backgroundColor: 'rgb(239 68 68 / 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'flash-up': 'flash-up 600ms ease-out',
        'flash-down': 'flash-down 600ms ease-out',
        'slide-up': 'slide-up 300ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
