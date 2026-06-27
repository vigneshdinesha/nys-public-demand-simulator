"use client"

import { Github, LineChart } from "lucide-react"

interface StoryFooterProps {
  githubUrl: string
}

export function StoryFooter({ githubUrl }: StoryFooterProps) {
  return (
    <footer className="relative border-t border-slate-200/60 bg-white/60 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                <LineChart className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                NYS Demand Simulator
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              A civic-tech tool estimating how unemployment shocks ripple into county-level
              Medicaid and SNAP demand. Built end-to-end: PDF extraction, data reconciliation,
              region-segmented OLS modeling, a FastAPI backend, and this interface.
            </p>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Github className="h-4 w-4" />
              View the source
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Method</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>Region-segmented OLS</li>
                <li>HC3 robust standard errors</li>
                <li>Confidence tiering</li>
                <li>Delta-on-baseline framing</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Stack</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>Python · pandas · statsmodels</li>
                <li>PostgreSQL (Neon)</li>
                <li>FastAPI</li>
                <li>Next.js · TypeScript · Tailwind</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/60 pt-6 text-xs text-slate-400">
          Data: NYS DOL, DOH, OTDA, NYSDOT, MTA, U.S. Census · 2018–2025. Estimates are for
          exploration, not policy decisions.
        </div>
      </div>
    </footer>
  )
}
