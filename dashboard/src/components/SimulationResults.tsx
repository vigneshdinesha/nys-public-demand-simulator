"use client"
// components/SimulationResults.tsx
import { AlertTriangle, DollarSign, Users } from "lucide-react"
import type { SimulationResult, MetricPrediction } from "@/lib/types"
import ConfidenceBadge from "./ConfidenceBadge"

function PredictionCard({
  label,
  pred,
  shock,
}: {
  label: string
  pred: MetricPrediction
  shock: number
}) {
  const isPositive = pred.delta_headcount > 0
  const deltaColor = isPositive ? "var(--red)" : "var(--green)"
  const ciSpan     = pred.delta_headcount_ci[1] - pred.delta_headcount_ci[0]
  const ciPct      = ciSpan > 0
    ? Math.abs(pred.delta_headcount) / ciSpan
    : 1

  return (
    <div className="card fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p className="section-label" style={{ marginBottom: 0 }}>{label}</p>
        <ConfidenceBadge confidence={pred.confidence} />
      </div>

      {/* Main number */}
      <div>
        <div className="stat-value" style={{ color: deltaColor, fontSize: 36 }}>
          {isPositive ? "+" : ""}{pred.delta_headcount.toLocaleString()} people
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {pred.pct_change != null && (
            <span style={{ color: deltaColor, fontWeight: 500 }}>
              {pred.pct_change > 0 ? "+" : ""}{pred.pct_change}%{" "}
            </span>
          )}
          from current {pred.current_per_1k} per 1k residents
        </div>
      </div>

      {/* CI bar */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 10, color: "var(--text-muted)", marginBottom: 6,
        }}>
          <span>95% Confidence Interval</span>
          <span>
            {pred.delta_headcount_ci[0] > 0 ? "+" : ""}{pred.delta_headcount_ci[0].toLocaleString()}
            {" → "}
            {pred.delta_headcount_ci[1] > 0 ? "+" : ""}{pred.delta_headcount_ci[1].toLocaleString()}
          </span>
        </div>
        <div style={{
          height: 6, background: "var(--bg-elevated)",
          borderRadius: 3, overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute",
            left:  `${Math.max(0, (1 - ciPct) * 50)}%`,
            right: `${Math.max(0, (1 - ciPct) * 50)}%`,
            height: "100%",
            background: deltaColor,
            opacity: 0.4,
            borderRadius: 3,
          }} />
          <div style={{
            position: "absolute",
            left:  "50%",
            transform: "translateX(-50%)",
            width: 2, height: "100%",
            background: deltaColor,
          }} />
        </div>
      </div>

      {/* Budget impact */}
      {pred.cost_impact && (
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <DollarSign size={12} color="var(--accent)" />
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: "0.15em",
              color: "var(--text-muted)", textTransform: "uppercase",
            }}>
              Budget Impact
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                ANNUAL COST
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                color: deltaColor, marginTop: 2,
              }}>
                {pred.cost_impact.annual_cost >= 0 ? "+" : ""}
                ${Math.abs(pred.cost_impact.annual_cost) >= 1_000_000
                  ? (pred.cost_impact.annual_cost / 1_000_000).toFixed(1) + "M"
                  : Math.abs(pred.cost_impact.annual_cost) >= 1_000
                  ? (pred.cost_impact.annual_cost / 1_000).toFixed(0) + "K"
                  : pred.cost_impact.annual_cost.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                ${Math.abs(pred.cost_impact.monthly_cost).toLocaleString()}/mo
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                CASEWORKERS
              </div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700,
                color: "var(--text-primary)", marginTop: 2,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Users size={16} color="var(--text-secondary)" />
                ~{Math.ceil(pred.cost_impact.caseworkers_needed)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                additional staff needed
              </div>
            </div>
          </div>

          {pred.cost_impact.pct_of_current_cost != null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--bg-card)",
              borderRadius: 4,
              fontSize: 12,
            }}>
              <span style={{ color: "var(--text-secondary)" }}>Share of current budget:</span>
              <span style={{ color: deltaColor, fontWeight: 600 }}>
                {pred.cost_impact.pct_of_current_cost > 0 ? "+" : ""}
                {pred.cost_impact.pct_of_current_cost}%
              </span>
            </div>
          )}

          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {pred.cost_impact.caveat}
          </div>
        </div>
      )}

      {/* Per-1k detail */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12, paddingTop: 12,
        borderTop: "1px solid var(--border)",
      }}>
        {[
          { label: "Current",   value: pred.current_per_1k?.toFixed(1) ?? "—" },
          { label: "Predicted", value: pred.predicted_per_1k?.toFixed(1) ?? "—" },
          { label: "Model R²",  value: pred.model_r2.toFixed(3) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence note */}
      <ConfidenceBadge confidence={pred.confidence} note={pred.confidence_note} />
    </div>
  )
}

export default function SimulationResults({ result }: { result: SimulationResult }) {
  const { predictions, warnings } = result
  const shock = result.unemp_shock_pp

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Scenario summary bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        padding: "12px 16px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        fontSize: 12,
      }}>
        <span style={{ color: "var(--text-secondary)" }}>Scenario</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {result.county}
        </span>
        <span style={{
          padding: "3px 10px", borderRadius: 999,
          background: shock > 0 ? "var(--red-soft)" : "var(--green-soft)",
          color: shock > 0 ? "var(--red)" : "var(--green)",
          fontSize: 12, fontWeight: 600,
        }}>
          {shock > 0 ? "+" : ""}{shock}pp unemployment
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {result.current_unemp}% → {result.shocked_unemp}%
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: "auto" }}>
          Pop. {result.population.toLocaleString()} · {result.region} region · as of {result.as_of_month}
        </span>
      </div>

      {/* Prediction cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {predictions.medicaid && (
          <PredictionCard label="Medicaid Impact" pred={predictions.medicaid} shock={shock} />
        )}
        {predictions.snap && (
          <PredictionCard label="SNAP Impact" pred={predictions.snap} shock={shock} />
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          padding: 14,
          background: "var(--amber-soft)",
          border: "1px solid var(--amber)",
          borderRadius: 10,
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertTriangle size={13} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
