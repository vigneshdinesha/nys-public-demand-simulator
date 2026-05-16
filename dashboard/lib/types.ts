export type Region = "NYC" | "Suburban" | "Upstate"
export type Confidence = "high" | "moderate" | "low"

export interface County { county: string; region: Region }

export interface HistoricalDataPoint {
  month: string                  // "2025-12-01" ISO
  year: number
  unemp_rate: number | null
  medicaid_per_1k: number | null
  snap_per_1k: number | null
}

export interface CostImpact {
  annual_cost: number
  annual_cost_ci: [number, number]
  monthly_cost: number
  cost_per_enrollee_mo?: number
  cost_per_person_mo?: number
  caseworkers_needed: number
  pct_of_current_cost: number | null
  caveat: string
}

export interface MetricPrediction {
  target: string
  current_per_1k: number | null
  predicted_per_1k: number | null
  delta_per_1k: number
  delta_per_1k_ci: [number, number]
  delta_headcount: number
  delta_headcount_ci: [number, number]
  pct_change: number | null
  confidence: Confidence
  confidence_note: string
  model_r2: number
  model_pvalue: number
  cost_impact?: CostImpact
}

export interface SimulationResult {
  county: string
  region: Region
  as_of_month: string            // "2025-12"
  unemp_shock_pp: number
  current_unemp: number
  shocked_unemp: number
  population: number
  predictions: { medicaid?: MetricPrediction; snap?: MetricPrediction }
  warnings: string[]
}

export interface Scenario {
  id: string
  label: string
  description: string
  county: string
  unemp_shock: number
}
