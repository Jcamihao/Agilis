/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Swiss Vanguard Studio — monochrome system ──────────────────────
        // `slate` / `gray` are remapped project-wide so that raw Tailwind
        // utility classes (text-slate-600, bg-gray-50, …) already used across
        // components fall into the new palette without per-file edits.
        // `white` / `black` stay literal — too many templates rely on
        // text-white/bg-black meaning true white/black to safely invert them.
        // Inverted role-for-role: light-mode slate-50 (subtle bg) → dark
        // elevated tone; slate-900 (primary text) → near-white. Monotonic
        // dark→light so hover:bg-slate-50 still reads as "more elevated".
        slate: {
          50:  '#1a1a1a',
          100: '#242424',
          200: '#333333',
          300: '#4a4a4a',
          400: '#737373',
          500: '#8e9192',
          600: '#a8abac',
          700: '#c4c7c8',
          800: '#e2e2e2',
          900: '#f5f5f5',
          950: '#ffffff',
        },
        gray: {
          50:  '#0e0e0e',
          100: '#1b1b1b',
          200: '#1f1f1f',
          300: '#2a2a2a',
          400: '#353535',
          500: '#444748',
          600: '#8e9192',
          700: '#c4c7c8',
          800: '#e2e2e2',
          900: '#f5f5f5',
          950: '#ffffff',
        },
        // primary-600/500 (the "main brand color" weight most templates use
        // for buttons/links/icons) = white. Low numbers (pale-tint chip
        // backgrounds in light mode) become dark elevated tones instead.
        primary: {
          50:  '#1a1a1a',
          100: '#242424',
          200: '#333333',
          300: '#5d5f5f',
          400: '#8e9192',
          500: '#c4c7c8',
          600: '#ffffff',
          700: '#e2e2e2',
          800: '#c4c7c8',
          900: '#8e9192',
          950: '#5d5f5f',
        },
        surface: {
          DEFAULT:       '#000000',
          secondary:     '#0a0a0a',
          tertiary:      '#131313',
          border:        'rgba(255,255,255,0.12)',
          'border-strong': 'rgba(255,255,255,0.38)',
        },
        sidebar: {
          DEFAULT:    '#000000',
          hover:      'rgba(255,255,255,0.04)',
          active:     'rgba(255,255,255,0.08)',
          border:     'rgba(255,255,255,0.12)',
          text:       '#737373',
          'text-hover':   '#d4d4d4',
          'text-active':  '#ffffff',
        },
        success: { DEFAULT: '#7cd992', light: 'rgba(124,217,146,0.12)', dark: '#3a7a4a' },
        warning: { DEFAULT: '#e8c468', light: 'rgba(232,196,104,0.12)', dark: '#8a6d1f' },
        danger:  { DEFAULT: '#ffb4ab', light: 'rgba(255,180,171,0.12)', dark: '#93000a' },
        info:    { DEFAULT: '#8ec3ff', light: 'rgba(142,195,255,0.12)', dark: '#2a5d94' },
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',   { lineHeight: '1rem' }],
        'sm':   ['0.875rem',  { lineHeight: '1.25rem' }],
        'base': ['1rem',      { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem',  { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',   { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',    { lineHeight: '2rem' }],
        '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',   { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18':  '4.5rem',
        '88':  '22rem',
        '92':  '23rem',
        '96':  '24rem',
        '128': '32rem',
      },
      // Swiss Vanguard: razor-sharp everywhere, full-round only for the
      // interactive pill scale (buttons/badges/chips opt in via rounded-full).
      borderRadius: {
        'sm':  '0px',
        DEFAULT: '0px',
        'md':  '0px',
        'lg':  '0px',
        'xl':  '0px',
        '2xl': '0px',
        '3xl': '0px',
      },
      // No drop shadows — depth comes from hairline borders + translucent layers.
      boxShadow: {
        'xs':         'none',
        'sm':         'none',
        DEFAULT:      'none',
        'md':         'none',
        'lg':         'none',
        'xl':         'none',
        '2xl':        'none',
        'card':       'none',
        'card-hover': 'none',
        'primary':    'none',
        'inner':      'none',
        'glass':      '0 8px 32px rgb(0 0 0 / 0.4)',
        'none':       'none',
      },
      animation: {
        'fade-in':        'fadeIn 0.18s ease-out',
        'fade-in-up':     'fadeInUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.22s ease-out',
        'slide-in-left':  'slideInLeft 0.22s ease-out',
        'scale-in':       'scaleIn 0.18s ease-out',
        'spin-slow':      'spin 3s linear infinite',
        'pulse-soft':     'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton':       'skeleton 1.6s ease-in-out infinite',
        'bounce-soft':    'bounceSoft 0.5s ease-out',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp:     { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(14px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft:  { '0%': { opacity: '0', transform: 'translateX(-14px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:      { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseSoft:    { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        skeleton: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      transitionDuration:    { '150': '150ms', '200': '200ms', '250': '250ms', '300': '300ms' },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
