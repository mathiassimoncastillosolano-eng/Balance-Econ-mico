/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        navy: token('navy'),
        brand: token('brand'),
        'brand-soft': token('brand-soft'),
        'brand-ink': token('brand-ink'),
        income: token('income'),
        'income-soft': token('income-soft'),
        expense: token('expense'),
        'expense-soft': token('expense-soft'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Manrope Variable"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        soft: '0 1px 2px rgb(var(--shadow) / 0.05), 0 4px 16px -6px rgb(var(--shadow) / 0.08)',
        lift: '0 2px 4px rgb(var(--shadow) / 0.06), 0 16px 40px -12px rgb(var(--shadow) / 0.22)',
        glow: '0 8px 30px -8px rgb(var(--brand) / 0.55)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        'rise-in': 'rise-in .4s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}
