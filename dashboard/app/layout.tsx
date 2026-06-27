import type { Metadata, Viewport } from 'next'
import { Inter, DM_Mono, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
})

// Editorial display serif — characterful, optical-sized: serious but expressive.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display-serif",
})

export const metadata: Metadata = {
  title: 'NYS Demand Simulator — Medicaid & SNAP Impact Modeling',
  description: 'Estimate how unemployment shocks would ripple into Medicaid and SNAP enrollment demand across all 62 NY counties. A civic-tech tool for county-level planners.',
  keywords: ['New York State', 'Medicaid', 'SNAP', 'unemployment', 'demand modeling', 'civic tech', 'budget planning'],
  authors: [{ name: 'NYS Demand Simulator' }],
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${dmMono.variable} ${fraunces.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
