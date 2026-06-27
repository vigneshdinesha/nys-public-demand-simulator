"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts"
import type { HistoricalDataPoint, SimulationResult } from "@/lib/types"

interface HistoricalChartProps {
  data: HistoricalDataPoint[]
  county: string
  simulation?: SimulationResult | null
}

// How many months of scenario projection to draw past "now".
const PROJECTION_MONTHS = 6

type ChartPoint = HistoricalDataPoint & {
  medicaid_baseline?: number | null
  medicaid_scenario?: number | null
  unemp_scenario?: number | null
}

function addMonths(month: string, k: number): string {
  const [y, m] = month.split("-").map(Number)
  const total = (m - 1) + k
  const ny = y + Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, "0")}`
}

export function HistoricalChart({ data, county, simulation }: HistoricalChartProps) {
  // A series is "available" only if at least one point has a non-null value.
  const hasMedicaid = data.some((d) => d.medicaid_per_1k != null)
  const hasSnap     = data.some((d) => d.snap_per_1k != null)
  const hasUnemp    = data.some((d) => d.unemp_rate != null)
  const snapMissingNote =
    !hasSnap && hasMedicaid
      ? "SNAP not reported at the borough level — only city-district totals are published."
      : null

  // Build the historical series + a dashed scenario projection from "now".
  const { chartData, nowMonth, hasProjection, lowConfidence } = useMemo(() => {
    const med = simulation?.predictions?.medicaid
    const lastPoint = data[data.length - 1]
    const lastMonth = lastPoint?.month?.slice(0, 7) // "YYYY-MM"

    if (!med || med.predicted_per_1k == null || !lastPoint || !lastMonth || !hasMedicaid) {
      return { chartData: data as ChartPoint[], nowMonth: null as string | null, hasProjection: false, lowConfidence: false }
    }

    const anchorMed = lastPoint.medicaid_per_1k ?? med.current_per_1k ?? med.predicted_per_1k
    const targetMed = med.predicted_per_1k
    const anchorUnemp = lastPoint.unemp_rate ?? simulation!.current_unemp
    const targetUnemp = simulation!.shocked_unemp

    // Anchor the projection on the last real point so the dashed lines connect.
    const anchored: ChartPoint[] = data.map((d, i) =>
      i === data.length - 1
        ? { ...d, medicaid_baseline: anchorMed, medicaid_scenario: anchorMed, unemp_scenario: anchorUnemp }
        : d,
    )

    // Medicaid ramps toward the modeled level; the unemployment shock lands immediately.
    const projected: ChartPoint[] = Array.from({ length: PROJECTION_MONTHS }, (_, idx) => {
      const step = (idx + 1) / PROJECTION_MONTHS
      return {
        month: addMonths(lastMonth, idx + 1),
        year: 0,
        unemp_rate: null,
        medicaid_per_1k: null,
        snap_per_1k: null,
        medicaid_baseline: anchorMed,
        medicaid_scenario: anchorMed + (targetMed - anchorMed) * step,
        unemp_scenario: targetUnemp,
      }
    })

    return {
      chartData: [...anchored, ...projected],
      nowMonth: lastMonth,
      hasProjection: true,
      lowConfidence: med.confidence !== "high",
    }
  }, [data, simulation, hasMedicaid])

  const formatMonth = (dateStr: string) => {
    // dateStr is "YYYY-MM" or "YYYY-MM-DD" — parse manually to avoid UTC-shift
    const [y, m] = dateStr.split("-")
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {label ? formatMonth(label) : ""}
          </p>
          {payload
            .filter((entry) => entry.value != null)
            .map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-600">{entry.name}:</span>
                <span className="font-medium text-slate-900">
                  {entry.value?.toFixed(1)}
                  {entry.name.includes("Unemployment") ? "%" : ""}
                </span>
              </div>
            ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {hasProjection ? "Historical Trends & Scenario Projection" : "Historical Trends"}
          </h3>
          <p className="text-xs text-slate-500">{county} County · 2018–2025</p>
        </div>
        {snapMissingNote && (
          <p className="max-w-xs rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-700">
            {snapMissingNote}
          </p>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              label={{
                value: "per 1,000 residents",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "#94a3b8" },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              label={{
                value: "Unemployment %",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 10, fill: "#94a3b8" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
              iconSize={8}
            />
            <ReferenceLine
              x="2020-04"
              yAxisId="left"
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: "COVID",
                position: "top",
                style: { fontSize: 10, fill: "#f59e0b", fontWeight: 500 },
              }}
            />
            {nowMonth && (
              <ReferenceLine
                x={nowMonth}
                yAxisId="left"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: "now",
                  position: "top",
                  style: { fontSize: 10, fill: "#64748b", fontWeight: 500 },
                }}
              />
            )}
            {hasMedicaid && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="medicaid_per_1k"
                name="Medicaid per 1k"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb" }}
                connectNulls={false}
              />
            )}
            {hasSnap && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="snap_per_1k"
                name="SNAP per 1k"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#10b981" }}
                connectNulls={false}
              />
            )}
            {hasUnemp && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="unemp_rate"
                name="Unemployment %"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#f43f5e" }}
                connectNulls={false}
              />
            )}

            {/* Scenario projection (dashed) */}
            {hasProjection && (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="medicaid_baseline"
                  name="Medicaid — no change"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                  legendType="plainline"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="medicaid_scenario"
                  name="Medicaid — your scenario"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                  legendType="plainline"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="unemp_scenario"
                  name="Unemployment — your scenario"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls
                  legendType="plainline"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hasProjection && (
        <p className="mt-3 text-[11px] leading-snug text-slate-400">
          Dashed lines project your scenario {PROJECTION_MONTHS} months past “now”: the
          unemployment shock lands immediately while Medicaid ramps toward the modeled level,
          against a held-flat baseline. Illustrative — not a forecast of future unemployment.
          {lowConfidence && " This region's Medicaid response to unemployment is a weak signal — treat the projection as a rough indicator."}
        </p>
      )}
    </div>
  )
}
