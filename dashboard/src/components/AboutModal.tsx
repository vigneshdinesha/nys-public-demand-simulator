"use client"
// components/AboutModal.tsx
import { useEffect } from "react"
import { X, Database, FileText, GitBranch, AlertCircle } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  githubUrl?: string
}

export default function AboutModal({ open, onClose, githubUrl }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15, 23, 42, 0.40)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeUp 0.18s ease forwards",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          maxWidth: 720,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          position: "sticky", top: 0,
          background: "var(--bg-card)",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 18, fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}>
              About this project
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.05em" }}>
              METHODOLOGY · DATA · LIMITATIONS
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 6,
              display: "flex", alignItems: "center",
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* What it is */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FileText size={13} color="var(--accent)" />
              <p className="section-label" style={{ marginBottom: 0 }}>What this is</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              A self-service analytics tool that lets county-level planners estimate the downstream
              demand effect of an unemployment shock on Medicaid and SNAP enrollment — in 30
              seconds, without needing to pull multiple datasets or build a spreadsheet model.
              The integration of six NYS public datasets into a single queryable panel is the
              core engineering contribution; the regression layer sits on top of it.
            </p>
          </section>

          {/* Data sources */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Database size={13} color="var(--accent)" />
              <p className="section-label" style={{ marginBottom: 0 }}>Six datasets, one panel</p>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              fontSize: 12, color: "var(--text-secondary)",
            }}>
              {[
                ["Unemployment", "NYS Dept. of Labor (LAUS)"],
                ["Medicaid", "NYS DOH — extracted from monthly PDFs"],
                ["SNAP", "NYS OTDA caseload data"],
                ["Crashes", "NYSDOT four-year window"],
                ["Transit ridership", "MTA monthly ridership"],
                ["Population", "U.S. Census Bureau"],
              ].map(([label, source]) => (
                <div key={label} style={{
                  padding: "10px 12px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{source}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6, margin: "12px 0 0" }}>
              Medicaid enrollment by county was not available as a structured download — it's
              published only as per-month PDF reports. A dedicated ingestion pipeline extracts,
              validates, and normalizes that data into a queryable time series with full
              auditability. ~67k county-month observations across 88 columns, 2018–2025.
            </p>
          </section>

          {/* Methodology */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <GitBranch size={13} color="var(--accent)" />
              <p className="section-label" style={{ marginBottom: 0 }}>Methodology</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              Region-specific OLS regression models (NYC / Suburban / Upstate) with
              heteroskedasticity-robust standard errors. Confidence intervals are 95%.
              The simulator returns a shock-induced delta on top of the existing baseline
              trajectory — not a full forecast — because monthly enrollment is highly
              autocorrelated. Cost translations use blended statewide Medicaid per-enrollee
              cost ($850/mo) and county-specific average SNAP benefits.
            </p>
          </section>

          {/* Honest limits */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertCircle size={13} color="var(--amber)" />
              <p className="section-label" style={{ marginBottom: 0, color: "var(--amber)" }}>What this is NOT</p>
            </div>
            <ul style={{
              fontSize: 12, color: "var(--text-secondary)",
              lineHeight: 1.7, margin: 0, paddingLeft: 18,
            }}>
              <li>Not a replacement for actuarial or budget-office modeling.</li>
              <li>Not a high-accuracy forecaster — R² peaks at ~0.22.</li>
              <li>Not equally reliable across all counties — NYC Medicaid signals are strong, Upstate is weak. Confidence badges flag this explicitly.</li>
              <li>SNAP for NYC is reported by city district, not borough, so per-borough SNAP impact cannot be estimated.</li>
            </ul>
          </section>

          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "10px 14px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 12,
                textDecoration: "none",
                gap: 8,
                width: "fit-content",
              }}
            >
              View source on GitHub →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
