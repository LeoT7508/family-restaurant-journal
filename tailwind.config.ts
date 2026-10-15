import type { Config } from 'tailwindcss'

/** Reads the CSS variables defined in src/styles/tokens.css. */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        line: token('line'),
        ink: { DEFAULT: token('ink'), muted: token('ink-muted') },
        brand: token('brand'),
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          soft: token('accent-soft'),
          ink: token('accent-ink'),
        },
        sage: { DEFAULT: token('sage'), soft: token('sage-soft') },
        highlight: { DEFAULT: token('highlight'), soft: token('highlight-soft') },
        calm: { DEFAULT: token('calm'), soft: token('calm-soft') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Type scale: [size, line-height]
        xs: ['0.75rem', '1.05rem'],
        sm: ['0.8125rem', '1.2rem'],
        base: ['0.9375rem', '1.4rem'],
        lg: ['1.0625rem', '1.5rem'],
        xl: ['1.25rem', '1.65rem'],
        '2xl': ['1.5rem', '1.9rem'],
        '3xl': ['1.875rem', '2.2rem'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      minHeight: { touch: 'var(--touch-min)' },
      minWidth: { touch: 'var(--touch-min)' },
      height: { touch: 'var(--touch-min)', 'bottom-nav': 'var(--bottom-nav-height)' },
      spacing: { gutter: 'var(--gutter)', 'bottom-nav': 'var(--bottom-nav-height)' },
    },
  },
  plugins: [],
} satisfies Config
