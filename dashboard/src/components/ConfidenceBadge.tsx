// components/ConfidenceBadge.tsx
import type { Confidence } from "@/lib/types"

const CONFIG: Record<Confidence, { label: string; color: string; bg: string }> = {
  high:     { label: "HIGH CONFIDENCE",     color: "#14A86A", bg: "#DCF5E6" },
  moderate: { label: "MODERATE CONFIDENCE", color: "#D89020", bg: "#FDF1D9" },
  low:      { label: "LOW CONFIDENCE",      color: "#E0563B", bg: "#FEE5DE" },
}

export default function ConfidenceBadge({
  confidence,
  note,
}: {
  confidence: Confidence
  note?: string
}) {
  const { label, color, bg } = CONFIG[confidence]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: bg,
          border: `1px solid ${color}40`,
          color,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.10em",
          width: "fit-content",
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: color, flexShrink: 0
        }} />
        {label}
      </span>
      {note && (
        <p style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          margin: 0,
          maxWidth: 480,
        }}>
          {note}
        </p>
      )}
    </div>
  )
}
