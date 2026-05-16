"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/header"
import { ScenarioBuilder } from "@/components/scenario-builder"
import { HistoricalChart } from "@/components/historical-chart"
import { ScenarioSummary } from "@/components/scenario-summary"
import { PredictionCard } from "@/components/prediction-card"
import { InsightsPanel } from "@/components/insights-panel"
import {
  getRegions,
  getScenarios,
  runSimulation,
  getHistorical,
} from "@/lib/api"
import type {
  County,
  Scenario,
  SimulationResult,
  HistoricalDataPoint,
} from "@/lib/types"

const GITHUB_URL = "https://github.com/vigneshdinesha/nys-public-demand-simulator"
const AUTORUN_PRESET_ID = "nyc_recession" // Bronx +3pp

const DATA_SOURCES = [
  { label: "Unemployment",      source: "NYS Dept. of Labor (LAUS)" },
  { label: "Medicaid",          source: "NYS DOH — extracted from monthly PDFs" },
  { label: "SNAP",              source: "NYS OTDA caseload data" },
  { label: "Crashes",           source: "NYSDOT four-year window" },
  { label: "Transit ridership", source: "MTA monthly ridership" },
  { label: "Population",        source: "U.S. Census Bureau" },
]

const CHART_METRICS = ["unemp_rate", "medicaid_per_1k", "snap_per_1k"]

function generateInsights(result: SimulationResult): string[] {
  const insights: string[] = []
  const { county, region, unemp_shock_pp, predictions, population, current_unemp, shocked_unemp } = result
  const shockDir = unemp_shock_pp > 0 ? "rise" : "fall"
  const absShock = Math.abs(unemp_shock_pp)

  insights.push(
    `A ${absShock}pp ${shockDir} in unemployment in ${county} — from ${current_unemp}% to ${shocked_unemp}% — would affect a county of ${population.toLocaleString()} residents.`
  )

  if (predictions.medicaid) {
    const m = predictions.medicaid
    if (m.confidence === "high") {
      insights.push(
        `Medicaid enrollment is expected to ${m.delta_headcount > 0 ? "increase" : "decrease"} by approximately ${Math.abs(m.delta_headcount).toLocaleString()} people (${m.pct_change != null ? Math.abs(m.pct_change).toFixed(1) + "%" : "—"}). Based on a statistically significant historical relationship in NYC-region counties (R²=${m.model_r2.toFixed(2)}, p<0.001).`
      )
    } else {
      insights.push(
        `Medicaid enrollment in ${region} counties is not strongly predicted by unemployment changes — enrollment here is driven more by long-term demographic trends and disability caseloads than by labor-market fluctuations. The estimate shown (${m.delta_headcount > 0 ? "+" : ""}${m.delta_headcount.toLocaleString()} people) should be treated as a rough indicator only.`
      )
    }
    if (m.cost_impact) {
      const c = m.cost_impact
      const annualStr = Math.abs(c.annual_cost) >= 1_000_000
        ? `$${(Math.abs(c.annual_cost) / 1_000_000).toFixed(1)}M`
        : `$${Math.abs(c.annual_cost).toLocaleString()}`
      insights.push(
        `At blended Medicaid cost (~$${c.cost_per_enrollee_mo ?? 850}/enrollee/month), this translates to a ${c.annual_cost >= 0 ? "+" : "-"}${annualStr}/year budget impact${c.pct_of_current_cost != null ? ` (${Math.abs(c.pct_of_current_cost).toFixed(1)}% of current Medicaid spend)` : ""}. Note: recession-era enrollees tend to be younger and healthier, so actual per-enrollee costs likely run below the blended average.`
      )
    }
  }

  if (predictions.snap) {
    const s = predictions.snap
    insights.push(
      `SNAP enrollment is expected to ${s.delta_headcount > 0 ? "increase" : "decrease"} by approximately ${Math.abs(s.delta_headcount).toLocaleString()} people. SNAP eligibility is more directly income-tied than Medicaid, making it a more responsive indicator of short-term shocks in ${region} counties.`
    )
    if (s.cost_impact) {
      const c = s.cost_impact
      const annualStr = Math.abs(c.annual_cost) >= 1_000_000
        ? `$${(Math.abs(c.annual_cost) / 1_000_000).toFixed(1)}M`
        : `$${Math.abs(c.annual_cost).toLocaleString()}`
      insights.push(
        `Based on ${county}'s actual average SNAP benefit of $${c.cost_per_person_mo ?? 193}/person/month, this represents ${c.annual_cost >= 0 ? "+" : "-"}${annualStr}/year in benefit outlays. Processing this caseload change would require approximately ${Math.ceil(c.caseworkers_needed)} additional caseworkers at standard OTDA staffing ratios.`
      )
    }
  }

  if (region === "NYC" && !predictions.snap) {
    insights.push(
      `SNAP data for NYC is reported at the city-district level rather than by borough, so per-borough SNAP impact cannot be estimated.`
    )
  }

  if (absShock >= 3) {
    insights.push(
      `A ${absShock}pp shock is comparable in magnitude to the unemployment increase seen during the 2008 financial crisis. During COVID-19, NYS unemployment rose by approximately 4pp in a single quarter — the largest single shock in the dataset.`
    )
  }

  insights.push(
    `These predictions represent the additional impact of the shock above the baseline trajectory. Monthly enrollment is highly autocorrelated, so most of next month's enrollment is already determined by this month's.`
  )

  return insights
}

export default function Home() {
  const [counties, setCounties]             = useState<County[]>([])
  const [scenarios, setScenarios]           = useState<Scenario[]>([])
  const [selectedCounty, setSelectedCounty] = useState("")
  const [unempShock, setUnempShock]         = useState(2.0)
  const [simulation, setSimulation]         = useState<SimulationResult | null>(null)
  const [historical, setHistorical]         = useState<HistoricalDataPoint[]>([])
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const autoRanRef = useRef(false)

  const handleRunSimulation = useCallback(async (county?: string, shock?: number) => {
    const c = county ?? selectedCounty
    const s = shock ?? unempShock
    if (!c) return
    setLoading(true)
    setError(null)
    try {
      const [result, hist] = await Promise.all([
        runSimulation(c, s),
        getHistorical(c, { metrics: CHART_METRICS }),
      ])
      setSimulation(result)
      setHistorical(hist.data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Simulation failed"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [selectedCounty, unempShock])

  // Bootstrap + auto-run the NYC recession preset on first load
  useEffect(() => {
    Promise.all([getRegions(), getScenarios()])
      .then(([r, s]) => {
        setCounties(r.counties)
        setScenarios(s.scenarios)
        if (!autoRanRef.current) {
          const preset = s.scenarios.find((x) => x.id === AUTORUN_PRESET_ID) ?? s.scenarios[0]
          if (preset) {
            autoRanRef.current = true
            setSelectedCounty(preset.county)
            setUnempShock(preset.unemp_shock)
            void handleRunSimulation(preset.county, preset.unemp_shock)
          }
        }
      })
      .catch(() => setError("Cannot reach API — is the FastAPI server running on port 8000?"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen">
      <Header dataSources={DATA_SOURCES} githubUrl={GITHUB_URL} />

      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex">
        <ScenarioBuilder
          counties={counties}
          scenarios={scenarios}
          selectedCounty={selectedCounty}
          unempShock={unempShock}
          onCountyChange={setSelectedCounty}
          onShockChange={setUnempShock}
          onRunSimulation={() => handleRunSimulation()}
        />

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1200px] space-y-6 p-6">
            {loading && !simulation && (
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Running simulation…
              </div>
            )}

            {historical.length > 0 && simulation && (
              <div className="animate-fade-up">
                <HistoricalChart data={historical} county={simulation.county} />
              </div>
            )}

            {simulation && (
              <div className="animate-fade-up" style={{ animationDelay: "50ms" }}>
                <ScenarioSummary result={simulation} />
              </div>
            )}

            {simulation && (
              <div className="grid gap-6 lg:grid-cols-2">
                {simulation.predictions.medicaid && (
                  <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
                    <PredictionCard
                      title="Medicaid Impact"
                      prediction={simulation.predictions.medicaid}
                      accentColor="blue"
                    />
                  </div>
                )}
                {simulation.predictions.snap && (
                  <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
                    <PredictionCard
                      title="SNAP Impact"
                      prediction={simulation.predictions.snap}
                      accentColor="green"
                    />
                  </div>
                )}
              </div>
            )}

            {simulation && (
              <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
                <InsightsPanel insights={generateInsights(simulation)} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
