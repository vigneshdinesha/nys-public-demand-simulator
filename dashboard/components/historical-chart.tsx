"use client"

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
import type { HistoricalDataPoint } from "@/lib/types"

interface HistoricalChartProps {
  data: HistoricalDataPoint[]
  county: string
}

export function HistoricalChart({ data, county }: HistoricalChartProps) {
  // A series is "available" only if at least one point has a non-null value.
  const hasMedicaid = data.some((d) => d.medicaid_per_1k != null)
  const hasSnap     = data.some((d) => d.snap_per_1k != null)
  const hasUnemp    = data.some((d) => d.unemp_rate != null)
  const snapMissingNote =
    !hasSnap && hasMedicaid
      ? "SNAP not reported at the borough level — only city-district totals are published."
      : null

  const formatMonth = (dateStr: string) => {
    // dateStr is "YYYY-MM" — parse manually to avoid UTC-shift on US timezones
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
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium text-slate-900">
                {entry.value?.toFixed(1)}
                {entry.name === "Unemployment %" ? "%" : ""}
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
          <h3 className="text-sm font-semibold text-slate-900">Historical Trends</h3>
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
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
