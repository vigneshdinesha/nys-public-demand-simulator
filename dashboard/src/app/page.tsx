"use client"
// app/page.tsx — Main dashboard
import { useState, useEffect, useCallback, useRef } from "react"
import { Activity, Info } from "lucide-react"

const GithubIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
)
import type { County, Scenario, SimulationResult, HistoricalDataPoint, Metric } from "@/lib/types"
import { getRegions, getScenarios, runSimulation, getHistorical } from "@/lib/api"
import ScenarioBuilder   from "@/components/ScenarioBuilder"
import SimulationResults from "@/components/SimulationResults"
import HistoricalChart   from "@/components/HistoricalChart"
import InsightsPanel     from "@/components/InsightsPanel"
import CountySelector    from "@/components/CountySelector"
import AboutModal        from "@/components/AboutModal"

const CHART_METRICS: Metric[] = ["unemp_rate", "medicaid_per_1k", "snap_per_1k"]
const GITHUB_URL = "https://github.com/vigneshdinesha/nys-public-demand-simulator"
const AUTHOR_NAME = "Vignesh D."
const AUTORUN_PRESET_ID = "nyc_recession" // Bronx +3pp — high-confidence Medicaid result

export default function Dashboard() {
  const [counties,       setCounties]       = useState<County[]>([])
  const [scenarios,      setScenarios]      = useState<Scenario[]>([])
  const [simResult,      setSimResult]      = useState<SimulationResult | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([])
  const [histCounty,     setHistCounty]     = useState("")
  const [loading,        setLoading]        = useState(false)
  const [histLoading,    setHistLoading]    = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [aboutOpen,      setAboutOpen]      = useState(false)
  const [scenarioCounty, setScenarioCounty] = useState("")
  const [scenarioShock,  setScenarioShock]  = useState(2.0)
  const autoRanRef = useRef(false)

  const handleSimulate = useCallback(async (county: string, shock: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await runSimulation(county, shock)
      setSimResult(result)
      setHistCounty(county)
    } catch (e: any) {
      setError(e.message ?? "Simulation failed")
    } finally {
      setLoading(false)
    }
  }, [])

  // Bootstrap + auto-run a preset so the dashboard isn't empty on first load
  useEffect(() => {
    Promise.all([getRegions(), getScenarios()]).then(([r, s]) => {
      setCounties(r.counties)
      setScenarios(s.scenarios)
      if (!autoRanRef.current) {
        const preset = s.scenarios.find(x => x.id === AUTORUN_PRESET_ID) ?? s.scenarios[0]
        if (preset) {
          autoRanRef.current = true
          setScenarioCounty(preset.county)
          setScenarioShock(preset.unemp_shock)
          handleSimulate(preset.county, preset.unemp_shock)
        }
      }
    }).catch(() => setError("Cannot reach API — is the FastAPI server running on port 8000?"))
  }, [handleSimulate])

  // Load historical data when county changes
  useEffect(() => {
    if (!histCounty) return
    setHistLoading(true)
    getHistorical(histCounty, { metrics: CHART_METRICS })
      .then(r => setHistoricalData(r.data))
      .finally(() => setHistLoading(false))
  }, [histCounty])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(247, 248, 251, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Activity size={18} color="var(--accent)" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 16, fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}>
                NYS Demand Simulator
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                by {AUTHOR_NAME}
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
              How unemployment shocks ripple into Medicaid &amp; SNAP demand across all 62 NY counties
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="chip" style={{ cursor: "default", fontSize: 11 }}>
            <span className="live-dot" />
            6 datasets · 2018–2025
          </span>
          <button onClick={() => setAboutOpen(true)} className="chip" style={{ fontWeight: 500 }}>
            <Info size={12} />
            About
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="chip"
            style={{ fontWeight: 500 }}
          >
            <GithubIcon size={12} />
            GitHub
          </a>
        </div>
      </header>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} githubUrl={GITHUB_URL} />

      {/* Error banner */}
      {error && (
        <div style={{
          margin: "16px 28px 0",
          padding: "12px 16px",
          background: "var(--red-soft)",
          border: "1px solid var(--red)",
          borderRadius: 10,
          color: "var(--red)",
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Main layout */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 20,
        padding: "20px 28px",
        maxWidth: 1400,
        margin: "0 auto",
      }}>
        {/* Left column — controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScenarioBuilder
            counties={counties}
            scenarios={scenarios}
            county={scenarioCounty}
            shock={scenarioShock}
            onCountyChange={setScenarioCounty}
            onShockChange={setScenarioShock}
            onRun={handleSimulate}
            loading={loading}
          />

          {/* Historical county picker */}
          <div className="card">
            <CountySelector
              counties={counties}
              value={histCounty}
              onChange={setHistCounty}
              label="Historical Data — County"
            />
            {histCounty && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
                Showing unemployment, Medicaid, and SNAP trends for {histCounty} from 2018–2025.
              </p>
            )}
          </div>
        </div>

        {/* Right column — outputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Historical chart */}
          {histCounty && historicalData.length > 0 && (
            <div className="fade-up">
              {histLoading ? (
                <div className="card" style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading historical data…</span>
                </div>
              ) : (
                <HistoricalChart
                  data={historicalData}
                  county={histCounty}
                  metrics={CHART_METRICS}
                />
              )}
            </div>
          )}

          {/* Simulation results */}
          {simResult && (
            <div className="fade-up">
              <SimulationResults result={simResult} />
            </div>
          )}

          {/* Insights */}
          {simResult && (
            <div className="fade-up">
              <InsightsPanel result={simResult} />
            </div>
          )}

          {/* Empty state */}
          {!simResult && !histCounty && (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: 400,
              color: "var(--text-muted)",
              fontSize: 12, textAlign: "center", gap: 12,
            }}>
              <Activity size={32} color="var(--border)" />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Select a county and run a scenario
                </div>
                <div>
                  Choose a county from the left panel, set an unemployment shock,<br />
                  and run the simulation to see predicted demand impacts.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
