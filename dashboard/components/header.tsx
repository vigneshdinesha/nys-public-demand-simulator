"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Github, Info, LineChart } from "lucide-react"

interface DataSource {
  label: string
  source: string
}

interface HeaderProps {
  dataSources: DataSource[]
  githubUrl?: string
}

export function Header({ dataSources, githubUrl = "https://github.com" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <LineChart className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight text-slate-900">
              NYS Demand Simulator
            </h1>
            <p className="text-sm text-slate-500">
              How unemployment shocks ripple into Medicaid & SNAP demand across all 62 NY counties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            6 datasets · 2018–2025
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Info className="h-4 w-4" />
                About
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">About this project</DialogTitle>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Methodology · Data · Limitations
                </p>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                <section>
                  <h3 className="mb-2 font-semibold text-slate-900">What this is</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    The NYS Demand Simulator is a civic-tech tool that estimates how unemployment 
                    shocks would ripple into Medicaid and SNAP enrollment demand at the county level. 
                    It&apos;s designed for county-level planners to run quick scenarios before budget 
                    meetings, providing predicted changes in enrollment headcount, budget impact, and 
                    staffing needs.
                  </p>
                </section>

                <section>
                  <h3 className="mb-3 font-semibold text-slate-900">Six datasets, one panel</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {dataSources.map((ds) => (
                      <div
                        key={ds.label}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                      >
                        <p className="font-medium text-slate-900">{ds.label}</p>
                        <p className="text-xs text-slate-500">{ds.source}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 font-semibold text-slate-900">Methodology</h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Predictions use OLS regression on a county-month panel dataset spanning 2018–2025. 
                    Models include region fixed effects and account for temporal autocorrelation in 
                    enrollment data. Heteroskedasticity-robust standard errors are used for confidence 
                    interval estimation. R² values and p-values are reported to convey model fit and 
                    statistical significance.
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                      !
                    </span>
                    What this is NOT
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      Not a forecast — this models hypothetical scenarios, not predictions of future unemployment
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      Not for policy decisions without further validation
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      Not a substitute for professional economic analysis
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      Cost estimates use blended averages — actual costs may vary significantly
                    </li>
                  </ul>
                </section>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
