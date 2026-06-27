"use client"

import { FileText } from "lucide-react"
import { Reveal } from "@/components/reveal"
import { useInView } from "@/hooks/use-in-view"
import { useCountUp } from "@/hooks/use-count-up"

const STATS = [
  { value: 1.64, decimals: 2, suffix: "M", label: "raw records ingested" },
  { value: 98,   decimals: 0, suffix: "",  label: "monthly Medicaid PDFs parsed" },
  { value: 6048, decimals: 0, suffix: "",  label: "clean county-month rows" },
  { value: 63,   decimals: 0, suffix: "",  label: "geographies (62 counties + NYC)" },
  { value: 96,   decimals: 0, suffix: "",  label: "months · 2018–2025" },
  { value: 6,    decimals: 0, suffix: "",  label: "datasets unified into one panel" },
] as const

const DATA_SOURCES = [
  { label: "Unemployment",      source: "NYS Dept. of Labor (LAUS)" },
  { label: "Medicaid",          source: "NYS DOH — extracted from monthly PDFs" },
  { label: "SNAP",              source: "NYS OTDA caseload data" },
  { label: "Crashes",           source: "NYSDOT four-year window" },
  { label: "Transit ridership", source: "MTA monthly ridership" },
  { label: "Population",        source: "U.S. Census Bureau" },
]

export function DataFoundation() {
  return (
    <section className="relative border-y border-slate-200/60 bg-white/50 py-24 backdrop-blur sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">The foundation</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Six messy public datasets, one clean panel.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            The hard part isn&apos;t the model — it&apos;s getting six sources that disagree on
            geography, time, and format to line up into a single county-by-month table.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <Stat {...s} />
            </Reveal>
          ))}
        </div>

        {/* PDF pipeline highlight */}
        <Reveal delay={120}>
          <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              <span className="font-semibold text-slate-900">Medicaid never came as data.</span>{" "}
              It only existed as 98 monthly PDF reports, so the pipeline parses tables out of
              every one, normalizes 62 county names, and validates each month against a 62-county
              invariant before it&apos;s allowed into the panel.
            </p>
          </div>
        </Reveal>

        {/* Sources */}
        <Reveal delay={160}>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DATA_SOURCES.map((ds) => (
              <div key={ds.label} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <p className="text-sm font-semibold text-slate-900">{ds.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500">{ds.source}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Stat({
  value, decimals, suffix, label,
}: { value: number; decimals: number; suffix: string; label: string }) {
  const { ref, inView } = useInView()
  const current = useCountUp(value, { start: inView })
  const display = decimals > 0
    ? current.toFixed(decimals)
    : Math.round(current).toLocaleString()

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <p className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {display}
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{suffix}</span>
      </p>
      <p className="mt-2 text-sm leading-snug text-slate-500">{label}</p>
    </div>
  )
}
