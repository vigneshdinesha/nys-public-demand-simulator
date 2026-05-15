"use client"
// components/ScenarioBuilder.tsx
import { Play, Zap } from "lucide-react"
import type { County, Scenario } from "@/lib/types"
import CountySelector from "./CountySelector"

interface Props {
  counties:    County[]
  scenarios:   Scenario[]
  county:      string
  shock:       number
  onCountyChange: (c: string) => void
  onShockChange:  (s: number) => void
  onRun:       (county: string, shock: number) => void
  loading:     boolean
}

export default function ScenarioBuilder({
  counties, scenarios, county, shock,
  onCountyChange, onShockChange, onRun, loading,
}: Props) {
  const handleRun = () => {
    if (!county) return
    onRun(county, shock)
  }

  const applyPreset = (s: Scenario) => {
    onCountyChange(s.county)
    onShockChange(s.unemp_shock)
  }

  const shockColor = shock > 0 ? "var(--red)" : shock < 0 ? "var(--green)" : "var(--text-secondary)"

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={14} color="var(--accent)" />
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}>
          Scenario Builder
        </span>
      </div>

      {/* County selector */}
      <CountySelector counties={counties} value={county} onChange={onCountyChange} />

      {/* Shock slider */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <p className="section-label" style={{ marginBottom: 0 }}>Unemployment Shock</p>
          <span
            className="tooltip"
            data-tip="pp = percentage points. A 3pp rise means unemployment goes from, say, 4% to 7% — not a 3% relative change."
            style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}
          >
            what's pp?
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range"
            min={-5} max={10} step={0.5}
            value={shock}
            onChange={e => onShockChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <span style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            color: shockColor,
            minWidth: 72,
            textAlign: "right",
            letterSpacing: "-0.02em",
          }}>
            {shock > 0 ? "+" : ""}{shock.toFixed(1)}
            <span style={{ fontSize: 13, marginLeft: 2, opacity: 0.7 }}>pp</span>
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>
          {shock > 0
            ? `Unemployment rises by ${shock} percentage points from current level`
            : shock < 0
            ? `Unemployment falls by ${Math.abs(shock)} percentage points from current level`
            : "No change — baseline projection only"}
        </p>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!county || loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 20px",
          background: county && !loading ? "var(--accent)" : "var(--bg-elevated)",
          border: "1px solid",
          borderColor: county && !loading ? "var(--accent)" : "var(--border)",
          borderRadius: 6,
          color: county && !loading ? "#fff" : "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 500,
          cursor: county && !loading ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          letterSpacing: "0.05em",
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              display: "inline-block",
            }} />
            Running simulation…
          </>
        ) : (
          <>
            <Play size={13} />
            Run Simulation
          </>
        )}
      </button>

      {/* Preset scenarios */}
      <div>
        <p className="section-label">Quick Scenarios</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => applyPreset(s)}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                cursor: "pointer",
                transition: "border-color 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                  {s.county} — {s.unemp_shock > 0 ? "+" : ""}{s.unemp_shock}pp
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: "3px 8px",
                background: s.unemp_shock > 0 ? "var(--red-soft)" : "var(--green-soft)",
                color: s.unemp_shock > 0 ? "var(--red)" : "var(--green)",
                borderRadius: 999, whiteSpace: "nowrap", fontWeight: 600,
              }}>
                {s.unemp_shock > 0 ? "+" : ""}{s.unemp_shock}pp
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
