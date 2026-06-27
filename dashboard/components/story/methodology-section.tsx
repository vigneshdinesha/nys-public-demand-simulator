"use client"

import { ShieldCheck, AlertTriangle, CircleHelp, CheckCircle2, XCircle } from "lucide-react"
import { Reveal } from "@/components/reveal"

const TIERS = [
  {
    tone: "emerald",
    icon: ShieldCheck,
    level: "High confidence",
    when: "Statistically significant relationship, meaningful fit.",
    example: "NYC Medicaid — R² = 0.22, p < 0.001. The signal is real and the tool leans on it.",
  },
  {
    tone: "amber",
    icon: AlertTriangle,
    level: "Moderate",
    when: "Significant but small effect, or limited fit.",
    example: "SNAP in several regions — directionally right, but unemployment explains only a sliver of the variation.",
  },
  {
    tone: "slate",
    icon: CircleHelp,
    level: "Low confidence",
    when: "No significant relationship in the data.",
    example: "Upstate Medicaid — driven by demographics and disability caseloads, not the job market. The tool says so instead of faking precision.",
  },
] as const

const TONE_CLASSES = {
  emerald: { ring: "ring-emerald-200", icon: "bg-emerald-100 text-emerald-600", chip: "text-emerald-700" },
  amber:   { ring: "ring-amber-200",   icon: "bg-amber-100 text-amber-600",     chip: "text-amber-700" },
  slate:   { ring: "ring-slate-200",   icon: "bg-slate-100 text-slate-600",     chip: "text-slate-700" },
} as const

export function MethodologySection() {
  return (
    <section id="method" className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">The honest part</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          What this can — and can&apos;t — tell you.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Most of the work went into knowing when the model is trustworthy. Every prediction
          ships with a confidence tier, and a weak signal is labeled weak — not dressed up.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {TIERS.map((tier, i) => {
          const c = TONE_CLASSES[tier.tone]
          const Icon = tier.icon
          return (
            <Reveal key={tier.level} delay={i * 100}>
              <div className={`flex h-full flex-col rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm ring-1 ${c.ring}`}>
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${c.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${c.chip}`}>{tier.level}</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{tier.when}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{tier.example}</p>
              </div>
            </Reveal>
          )
        })}
      </div>

      {/* Is / Is not */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> What it is
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
              {[
                "A scenario tool: \"if unemployment moved by X, here's the estimated demand response above baseline.\"",
                "Honest about uncertainty — confidence tiers are first-class output.",
                "Grounded in real, reconciled NYS public data, 2018–2025.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1 text-emerald-500">•</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="h-full rounded-2xl border border-rose-200/70 bg-rose-50/40 p-6">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <XCircle className="h-5 w-5 text-rose-500" /> What it is not
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-600">
              {[
                "Not a forecast — it models hypotheticals, not predictions of future unemployment.",
                "Not a policy decision tool without further validation.",
                "Cost figures use blended averages, so treat them as order-of-magnitude.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1 text-rose-400">•</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
