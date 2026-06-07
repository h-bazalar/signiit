/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Signiit brand tokens ──
        'sig-forest':     '#0F4A38',
        'sig-forest-d':   '#0D3B2E',
        'sig-signal':     '#1A6B5A',
        'sig-mid':        '#3DAB8E',
        'sig-mint':       '#5EC9AD',
        'sig-mint-light': '#C8F0E6',
        'sig-paper':      '#F7F5F0',
        'sig-warm':       '#F0EDE6',
        'sig-stone':      '#8C8880',
        // ── Awareness ──
        'aw-green':       '#E4F5EF',
        'aw-blue':        '#EBF0FB',
        'aw-amber':       '#FDF3E4',
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['Space Mono', 'monospace'],
      },
      borderWidth: {
        'half': '0.5px',
      },
    },
  },
  plugins: [],
}
