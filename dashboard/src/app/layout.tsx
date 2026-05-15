// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title:       "NYS Demand Simulator — Public service impact of unemployment shocks",
  description: "Interactive scenario tool that estimates how unemployment changes ripple into Medicaid and SNAP enrollment across all 62 New York State counties. Built on an integrated panel of six NYS public datasets (2018–2025).",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
