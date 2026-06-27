"use client"

import { useEffect, useState } from "react"
import { Activity, Database, LineChart, RefreshCw } from "lucide-react"

const PHASES = [
  { at: 0,  icon: Activity,  label: "Connecting to the simulation API…" },
  { at: 6,  icon: Database,  label: "Waking the server — free tier sleeps when idle…" },
  { at: 16, icon: Database,  label: "Loading the county-month panel…" },
  { at: 28, icon: LineChart, label: "Spinning up the regression models…" },
  { at: 42, icon: LineChart, label: "Almost there — first boot takes a little longer…" },
]

interface WarmingCardProps {
  failed?: boolean
  onRetry?: () => void
}

/** Inline "server is waking up" state shown inside the simulator results area. */
export function WarmingCard({ failed = false, onRetry }: WarmingCardProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (failed) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [failed])

  const phase = [...PHASES].reverse().find((p) => elapsed >= p.at) ?? PHASES[0]
  const PhaseIcon = phase.icon

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/70 p-8 text-center shadow-sm backdrop-blur">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30">
        {!failed && (
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent opacity-60 blur-lg animate-pulse-glow" />
        )}
        <LineChart className="relative h-7 w-7 text-white" strokeWidth={2.2} />
      </div>

      {failed ? (
        <>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            The simulation server didn&apos;t wake in time. It runs on a free tier that sleeps
            when idle — this usually clears on a second try.
          </p>
          <button
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.03] hover:shadow-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </>
      ) : (
        <>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <PhaseIcon className="h-4 w-4 text-primary" />
            <span key={phase.label} className="animate-fade-up">{phase.label}</span>
          </p>
          <div className="mx-auto mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary to-accent animate-slide-loop" />
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground/70">
            {elapsed}s elapsed{elapsed >= 30 ? " · hang tight" : ""}
          </p>
        </>
      )}
    </div>
  )
}
