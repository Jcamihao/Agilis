// Swiss Vanguard Studio — light (paper) is the default; dark (the original
// black-canvas take) is a toggleable feature. Colors below reference CSS
// custom properties (RGB triples, defined in src/styles/main.scss) instead
// of literal hex, using Tailwind's `rgb(var(--x) / <alpha-value>)` pattern —
// that's what lets a single `bg-slate-500` / `bg-primary-600` / `bg-surface`
// class repaint itself when `[data-theme="dark"]` flips the variables,
// with no per-component template changes.
function v(name) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        slate: {
          50:  v('--c-50'),  100: v('--c-100'), 200: v('--c-200'), 300: v('--c-300'),
          400: v('--c-400'), 500: v('--c-500'), 600: v('--c-600'), 700: v('--c-700'),
          800: v('--c-800'), 900: v('--c-900'), 950: v('--c-950'),
        },
        gray: {
          50:  v('--c-50'),  100: v('--c-100'), 200: v('--c-200'), 300: v('--c-300'),
          400: v('--c-400'), 500: v('--c-500'), 600: v('--c-600'), 700: v('--c-700'),
          800: v('--c-800'), 900: v('--c-900'), 950: v('--c-950'),
        },
        // primary-600 is the app's main action fill (dark charcoal in light
        // mode, white in dark mode) — see --p-* variables.
        primary: {
          50:  v('--p-50'),  100: v('--p-100'), 200: v('--p-200'), 300: v('--p-300'),
          400: v('--p-400'), 500: v('--p-500'), 600: v('--p-600'), 700: v('--p-700'),
          800: v('--p-800'), 900: v('--p-900'), 950: v('--p-950'),
        },
        surface: {
          DEFAULT:       v('--c-surface'),
          secondary:     v('--c-canvas'),
          tertiary:      v('--c-surface-2'),
          border:        'rgb(var(--c-border) / 0.12)',
          'border-strong': 'rgb(var(--c-border) / 0.35)',
        },
        sidebar: {
          DEFAULT:    v('--c-surface'),
          hover:      'rgb(var(--c-border) / 0.04)',
          active:     'rgb(var(--c-border) / 0.08)',
          border:     'rgb(var(--c-border) / 0.12)',
          text:       v('--c-600'),
          'text-hover':   v('--c-800'),
          'text-active':  v('--c-900'),
        },
        success: { DEFAULT: v('--f-success'), light: 'rgb(var(--f-success) / 0.1)', dark: v('--f-success') },
        warning: { DEFAULT: v('--f-warning'), light: 'rgb(var(--f-warning) / 0.1)', dark: v('--f-warning') },
        danger:  { DEFAULT: v('--f-danger'),  light: 'rgb(var(--f-danger) / 0.1)',  dark: v('--f-danger') },
        info:    { DEFAULT: v('--f-info'),    light: 'rgb(var(--f-info) / 0.1)',    dark: v('--f-info') },
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
      // No drop shadows — depth comes from hairline borders, not elevation.
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
        'glass':      '0 8px 32px rgb(var(--c-border) / 0.15)',
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
