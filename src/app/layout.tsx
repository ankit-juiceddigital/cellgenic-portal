// File: src/app/layout.tsx

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'CellGenic · Provider Portal',
  description: 'Verified-provider sales management portal',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#14181D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts are loaded with the design's own <link>, not next/font.
          next/font downloads the font files at BUILD time, so
          `npm run build` fails outright on any machine or CI runner
          without access to fonts.googleapis.com. The three families are
          referenced by their literal names in globals.css, so this is
          also the exact setup the approved HTML used.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
