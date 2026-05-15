"use client"
// components/HistoricalChart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts"
import type { HistoricalDataPoint, Metric } from "@/lib/types"
import { METRIC_LABELS, METRIC_COLOR } from "@/lib/types"

interface Props {
  data:     HistoricalDataPoint[]
  county:   string
  metrics:  Metric[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "10px 14px",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      minWidth: 160,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.05em" }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{
          display: "flex", justifyContent: "space-between",
          gap: 20, color: p.color, marginBottom: 4,
        }}>
          <span style={{ color: "var(--text-secondary)" }}>
            {METRIC_LABELS[p.dataKey as Metric] ?? p.dataKey}
          </span>
          <span style={{ fontWeight: 600 }}>
            {p.value != null ? Number(p.value).toFixed(1) : "—"}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function HistoricalChart({ data, county, metrics }: Props) {
  // Format month labels
  const formatted = data.map(d => ({
    ...d,
    label: d.month.slice(0, 7), // YYYY-MM
  }))

  return (
    <div className="card">
      <p className="section-label">Historical Trends — {county}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={formatted} margin={{ top: 4, right: 48, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            interval={11}
          />
          {/* Left axis — enrollment metrics (per 1k) */}
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {/* Right axis — unemployment rate (%) */}
          {metrics.includes("unemp_rate") && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: METRIC_COLOR.unemp_rate, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => `${v}%`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontSize: 11, fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)", paddingTop: 12,
            }}
            formatter={(value) => METRIC_LABELS[value as Metric] ?? value}
          />

          {/* COVID reference band */}
          <ReferenceLine
            yAxisId="left"
            x="2020-03" stroke="var(--border-hover)" strokeDasharray="4 4"
            label={{ value: "COVID", fill: "var(--text-muted)", fontSize: 10, position: "insideTopRight" }}
          />
          <ReferenceLine yAxisId="left" x="2022-01" stroke="var(--border)" strokeDasharray="4 4" />

          {metrics.map(metric => (
            <Line
              key={metric}
              yAxisId={metric === "unemp_rate" ? "right" : "left"}
              type="monotone"
              dataKey={metric}
              stroke={METRIC_COLOR[metric]}
              strokeWidth={metric === "unemp_rate" ? 1.5 : 2}
              strokeDasharray={metric === "unemp_rate" ? "6 3" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
