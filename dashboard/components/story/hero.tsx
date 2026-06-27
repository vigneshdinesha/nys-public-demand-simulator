"use client"

import { ArrowDown, Play, BookOpen } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Floating ambient accents (the page-wide aurora sits behind this) */}
      <div className="pointer-events-none absolute left-[12%] top-[22%] h-40 w-40 rounded-full bg-primary/20 blur-3xl animate-float-slow" aria-hidden />
      <div className="pointer-events-none absolute right-[14%] bottom-[24%] h-48 w-48 rounded-full bg-accent/20 blur-3xl animate-float-slow" style={{ animationDelay: "1.5s" }} aria-hidden />

      <div className="relative max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live model · 6 datasets · 2018–2025
        </div>

        <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-slate-900 sm:text-6xl md:text-7xl">
          When a New York county
          <br className="hidden sm:block" />{" "}
          loses jobs,{" "}
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text pr-[0.14em] italic text-transparent animate-gradient-x [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
            who feels it?
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          An interactive model of how an unemployment shock ripples into Medicaid and
          SNAP demand — and what it costs in dollars and caseworkers — across all 62
          New York counties.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#simulator"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.03] hover:shadow-xl"
          >
            <Play className="h-4 w-4" />
            Run a scenario
          </a>
          <a
            href="#method"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-all hover:bg-white"
          >
            <BookOpen className="h-4 w-4" />
            How it works
          </a>
        </div>
      </div>

      <a
        href="#ripple"
        aria-label="Scroll down"
        className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-400 transition-colors hover:text-slate-600"
      >
        <span className="text-xs font-medium uppercase tracking-widest">Scroll</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </a>
    </section>
  )
}
