"use client"
// components/InsightsPanel.tsx
import { BookOpen } from "lucide-react"
import type { SimulationResult } from "@/lib/types"

function generateInsights(result: SimulationResult): string[] {
  const insights: string[] = []
  const { county, region, unemp_shock_pp, predictions, population, current_unemp } = result

  const shockDir  = unemp_shock_pp > 0 ? "rise" : "fall"
  const absShock  = Math.abs(unemp_shock_pp)

  // Intro
  insights.push(
    `A ${absShock}pp ${shockDir} in unemployment in ${county} — from ${current_unemp}% to ${result.shocked_unemp}% — would affect a county of ${population.toLocaleString()} residents as follows.`
  )

  // Medicaid insight
  if (predictions.medicaid) {
    const m = predictions.medicaid
    if (m.confidence === "high") {
      insights.push(
        `Medicaid enrollment is expected to ${m.delta_headcount > 0 ? "increase" : "decrease"} by approximately ${Math.abs(m.delta_headcount).toLocaleString()} people (${m.pct_change != null ? Math.abs(m.pct_change) + "%" : "unknown pct"}). ` +
        `This estimate is based on a statistically significant historical relationship between unemployment and Medicaid demand in NYC-region counties (R²=${m.model_r2.toFixed(2)}).`
      )
    } else {
      insights.push(
        `Medicaid enrollment in ${region} counties is not strongly predicted by unemployment changes — enrollment here is driven more by long-term demographic trends and disability caseloads than by labor market fluctuations. ` +
        `The directional estimate shown (${m.delta_headcount > 0 ? "+" : ""}${m.delta_headcount.toLocaleString()} people) should be treated as a rough indicator only.`
      )
    }
    if (m.cost_impact) {
      const c = m.cost_impact
      const annualStr = Math.abs(c.annual_cost) >= 1_000_000
        ? `$${(Math.abs(c.annual_cost) / 1_000_000).toFixed(1)}M`
        : `$${Math.abs(c.annual_cost).toLocaleString()}`
      insights.push(
        `At the blended statewide Medicaid cost of $${c.cost_per_enrollee_mo ?? 850}/enrollee/month, this translates to a ${c.annual_cost >= 0 ? "+" : "-"}${annualStr}/year budget impact` +
        `${c.pct_of_current_cost != null ? ` (${Math.abs(c.pct_of_current_cost)}% of the county's current Medicaid expenditure)` : ""}. ` +
        `Note: new enrollees during economic downturns tend to be younger and healthier, so actual per-enrollee costs are likely below the blended average.`
      )
    }
  }

  // SNAP insight
  if (predictions.snap) {
    const s = predictions.snap
    insights.push(
      `SNAP enrollment is expected to ${s.delta_headcount > 0 ? "increase" : "decrease"} by approximately ${Math.abs(s.delta_headcount).toLocaleString()} people. ` +
      `SNAP eligibility is more directly income-tied than Medicaid, making it a more responsive indicator of short-term economic shocks in ${region} counties.`
    )
    if (s.cost_impact) {
      const c = s.cost_impact
      const annualStr = Math.abs(c.annual_cost) >= 1_000_000
        ? `$${(Math.abs(c.annual_cost) / 1_000_000).toFixed(1)}M`
        : `$${Math.abs(c.annual_cost).toLocaleString()}`
      insights.push(
        `Based on ${county}'s actual average SNAP benefit of $${c.cost_per_person_mo ?? 193}/person/month, this represents ${c.annual_cost >= 0 ? "+" : "-"}${annualStr}/year in benefit outlays` +
        `${c.pct_of_current_cost != null ? `, a ${Math.abs(c.pct_of_current_cost)}% change relative to current SNAP spending` : ""}. ` +
        `Processing this caseload increase would require approximately ${Math.ceil(c.caseworkers_needed)} additional caseworkers at standard OTDA staffing ratios.`
      )
    }
  }

  // NYC SNAP note
  if (region === "NYC" && !predictions.snap) {
    insights.push(
      `SNAP data for NYC is reported at the city-district level rather than by borough, so per-borough SNAP impact cannot be estimated from this model.`
    )
  }

  // Shock magnitude context
  if (absShock >= 3) {
    insights.push(
      `A ${absShock}pp shock is comparable in magnitude to the unemployment increase seen during the 2008 financial crisis. ` +
      `During COVID-19, NYS unemployment rose by approximately 4pp in a single quarter — the largest single shock in the dataset.`
    )
  } else if (absShock <= 1) {
    insights.push(
      `A ${absShock}pp change represents a moderate labor market fluctuation within the normal range of month-to-month variation in NYS county unemployment data.`
    )
  }

  // Autocorrelation note
  insights.push(
    `Note: These predictions represent the additional impact of the unemployment shock above the existing baseline trajectory. ` +
    `Monthly enrollment figures are highly autocorrelated — meaning most of next month's enrollment is already determined by this month's. ` +
    `Use the baseline trend chart alongside these predictions to understand the full picture.`
  )

  return insights
}

export default function InsightsPanel({ result }: { result: SimulationResult }) {
  const insights = generateInsights(result)

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BookOpen size={14} color="var(--accent)" />
        <p className="section-label" style={{ marginBottom: 0 }}>
          Plain-Language Interpretation
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {insights.map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              color: "var(--accent)",
              fontWeight: 700,
              minWidth: 20,
              marginTop: 2,
            }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              margin: 0,
            }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 4, paddingTop: 12,
        borderTop: "1px solid var(--border)",
        fontSize: 10, color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        Model based on NYS county-month panel data 2018–2025. Predictions use OLS regression
        with heteroskedasticity-robust standard errors. Not for policy decisions without
        further validation.
      </div>
    </div>
  )
}
