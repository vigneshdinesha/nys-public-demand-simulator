// lib/types.ts — shared TypeScript types for the NYS Demand Simulator

export type Region = "NYC" | "Suburban" | "Upstate"
export type Confidence = "high" | "moderate" | "low"

export interface County {
  county: string
  region: Region
}

export interface HistoricalDataPoint {
  month: string
  year: number
  unemp_rate: number | null
  medicaid_per_1k: number | null
  medicaid_enrollment: number | null
  snap_per_1k: number | null
  snap_persons: number | null
  crash_count: number | null
  crashes_per_100k: number | null
  mta_ridership: number | null
  population: number | null
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

export interface BaselineTrend {
  medicaid_per_1k: number[]
  snap_per_1k: number[]
  unemp_rate: number[]
  horizon_months: number
  note: string
}

export interface SimulationResult {
  county: string
  region: Region
  as_of_month: string
  unemp_shock_pp: number
  current_unemp: number
  shocked_unemp: number
  population: number
  predictions: {
    medicaid?: MetricPrediction
    snap?: MetricPrediction
  }
  baseline_trend: BaselineTrend
  warnings: string[]
}

export interface Scenario {
  id: string
  label: string
  description: string
  county: string
  unemp_shock: number
}

export type Metric =
  | "unemp_rate"
  | "medicaid_per_1k"
  | "snap_per_1k"
  | "crashes_per_100k"
  | "mta_ridership"

export const METRIC_LABELS: Record<Metric, string> = {
  unemp_rate:       "Unemployment Rate (%)",
  medicaid_per_1k:  "Medicaid Enrollees per 1,000",
  snap_per_1k:      "SNAP Recipients per 1,000",
  crashes_per_100k: "Crashes per 100,000",
  mta_ridership:    "MTA Monthly Ridership",
}

export const METRIC_COLOR: Record<Metric, string> = {
  unemp_rate:       "#E05C3A",
  medicaid_per_1k:  "#3A7EE0",
  snap_per_1k:      "#3ABF7A",
  crashes_per_100k: "#E0B43A",
  mta_ridership:    "#9B3AE0",
}

export const REGION_COLOR: Record<Region, string> = {
  NYC:      "#E05C3A",
  Suburban: "#E0B43A",
  Upstate:  "#3A7EE0",
}
