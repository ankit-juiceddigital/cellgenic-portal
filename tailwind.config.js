/** @type {import('tailwindcss').Config} */
// The v2 UI is styled entirely by globals.css, which was extracted
// verbatim from the approved design. Tailwind stays installed because
// the pages that haven't been migrated yet (inventory, calculator,
// referral, settings) still use utilities — but NOTHING in the new
// design should be re-expressed here.
//
// preflight is disabled: the design ships its own resets, and
// Tailwind's would override the `button { background: none }` and
// heading resets the layout depends on.
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // LEGACY: pages not yet migrated use bg-brand / text-brand /
        // hover:bg-brand-dark. Pointed at the v2 ink so they match the new
        // design rather than keeping the old #0F6E56 green.
        brand: { DEFAULT: '#14181D', dark: '#000000', light: '#EFEDE7' },
        // Mirrors the CSS variables so a utility can reach a design
        // colour when a legacy page needs one. Source of truth is
        // globals.css :root.
        ink: '#14181D',
        paper: '#F6F5F1',
        line: '#E5E3DC',
        muted: '#6F7580',
        jade: '#0F6B57',
        amber: '#A96A0B',
        clay: '#A93B26',
        indigo: '#2B4B8C',
        violet: '#5B3E9E',
        slate: '#4B5158',
      },
      fontFamily: {
        // Literal names, matching globals.css — the families come from the
        // <link> in layout.tsx, not next/font.
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"Inter Tight"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
