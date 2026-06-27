"use client"

import { useEffect, useState } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts"
import { getHistorical } from "@/lib/api"
import type { HistoricalDataPoint } from "@/lib/types"
import { useInView } from "@/hooks/use-in-view"
import { Reveal } from "@/components/reveal"

// The Bronx is the clearest NYC-region signal — the model's high-confidence case.
const COUNTY = "Bronx"

function formatMonth(dateStr: string) {
  const [y, m] = dateStr.split("-")
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

export function CovidMoment() {
  const { ref, inView } = useInView({ threshold: 0.25 })
  const [data, setData] = useState<HistoricalDataPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!inView || data || failed) return
    getHistorical(COUNTY, {
      startYear: 2019,
      endYear: 2022,
      metrics: ["unemp_rate", "medicaid_per_1k"],
    })
      .then((r) => setData(r.data))
      .catch(() => setFailed(true))
  }, [inView, data, failed])

  // If the data can't load, drop the section rather than show a broken block.
  if (failed) return null

  return (
    <section ref={ref} className="relative border-y border-slate-200/60 bg-slate-900 py-24 text-white sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">The proof</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            We&apos;ve seen this ripple <span className="italic text-primary">before</span>.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-300">
            In spring 2020, unemployment in the Bronx tore upward almost overnight. In the months
            that followed, Medicaid enrollment climbed and stayed elevated — the real-world version
            of the chain this tool models.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            That co-movement is exactly why the NYC-region Medicaid model earns{" "}
            <span className="font-semibold text-white">high confidence</span> — and why the same
            model honestly reports a weak signal in places where the relationship isn&apos;t there.
          </p>

          <div className="mt-8 flex gap-8">
            <div>
              <p className="font-display text-3xl font-bold text-primary">~4pp</p>
              <p className="mt-1 text-sm text-slate-400">unemployment spike, weeks</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-accent">months</p>
              <p className="mt-1 text-sm text-slate-400">later, Medicaid rose</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="mb-1 text-sm font-semibold text-white">Bronx · 2019–2022</p>
            <p className="mb-4 text-xs text-slate-400">Real reported data — not a model output</p>
            <div className="h-72">
              {data ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                      minTickGap={24}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelFormatter={(l) => formatMonth(String(l))}
                    />
                    <ReferenceLine
                      x="2020-04"
                      yAxisId="left"
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: "COVID", position: "top", style: { fontSize: 10, fill: "#f59e0b", fontWeight: 600 } }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="medicaid_per_1k"
                      name="Medicaid per 1k"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      animationDuration={1600}
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="unemp_rate"
                      name="Unemployment %"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={false}
                      animationDuration={1600}
                      animationBegin={300}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-full w-1/3 overflow-hidden rounded-xl">
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-loop" />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#2563eb]" /> Medicaid per 1k</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f43f5e]" /> Unemployment %</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
