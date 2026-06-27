"use client"

import { TrendingUp, HeartPulse, Utensils, DollarSign, Users, ArrowRight } from "lucide-react"
import { Reveal } from "@/components/reveal"

export function RippleSection() {
  return (
    <section id="ripple" className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">The premise</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          A layoff wave doesn&apos;t stop at the unemployment line.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          When jobs disappear, people lean on the safety net — and counties have to
          fund and staff that demand. This tool traces that ripple, one stage at a time.
        </p>
      </Reveal>

      <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {/* Stage 1 — the shock */}
        <Reveal>
          <Stage
            tone="rose"
            icon={<TrendingUp className="h-6 w-6" />}
            kicker="The shock"
            title="Unemployment rises"
            body="A recession, a plant closure, a sector layoff — the unemployment rate jumps by a few percentage points."
            ripple
          />
        </Reveal>

        <Connector />

        {/* Stage 2 — the demand */}
        <Reveal delay={120}>
          <Stage
            tone="blue"
            icon={
              <div className="flex gap-1">
                <HeartPulse className="h-6 w-6" />
                <Utensils className="h-6 w-6" />
              </div>
            }
            kicker="The demand"
            title="Safety-net enrollment shifts"
            body="Medicaid and SNAP caseloads respond — strongly in some places, barely in others. The model learns which is which."
          />
        </Reveal>

        <Connector />

        {/* Stage 3 — the cost */}
        <Reveal delay={240}>
          <Stage
            tone="amber"
            icon={
              <div className="flex gap-1">
                <DollarSign className="h-6 w-6" />
                <Users className="h-6 w-6" />
              </div>
            }
            kicker="The cost"
            title="Budgets & staffing feel it"
            body="Every enrollment change has a dollar figure and a caseworker count behind it — the numbers a county planner actually budgets around."
          />
        </Reveal>
      </div>
    </section>
  )
}

const TONES = {
  rose:  { ring: "ring-rose-200",   bg: "bg-rose-50",    icon: "bg-rose-100 text-rose-600",     dot: "bg-rose-400" },
  blue:  { ring: "ring-blue-200",   bg: "bg-blue-50",    icon: "bg-blue-100 text-blue-600",     dot: "bg-blue-400" },
  amber: { ring: "ring-amber-200",  bg: "bg-amber-50",   icon: "bg-amber-100 text-amber-600",   dot: "bg-amber-400" },
} as const

function Stage({
  tone, icon, kicker, title, body, ripple = false,
}: {
  tone: keyof typeof TONES
  icon: React.ReactNode
  kicker: string
  title: string
  body: string
  ripple?: boolean
}) {
  const t = TONES[tone]
  return (
    <div className={`group relative flex h-full flex-col rounded-2xl border border-slate-200/60 ${t.bg} p-6 ring-1 ${t.ring} transition-all hover:-translate-y-1 hover:shadow-lg`}>
      <div className={`relative mb-4 flex h-12 w-fit items-center justify-center rounded-xl px-3 ${t.icon}`}>
        {ripple && (
          <>
            <span className={`absolute inset-0 rounded-xl ${t.dot} opacity-30 animate-ripple`} />
            <span className={`absolute inset-0 rounded-xl ${t.dot} opacity-30 animate-ripple`} style={{ animationDelay: "1s" }} />
          </>
        )}
        <span className="relative">{icon}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{kicker}</p>
      <h3 className="mt-1 font-display text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex items-center justify-center lg:flex-col">
      <ArrowRight className="h-6 w-6 rotate-90 text-slate-300 lg:rotate-0" />
    </div>
  )
}
