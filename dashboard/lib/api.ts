// lib/api.ts — typed API client for the NYS Demand Simulator FastAPI backend

import type {
  County, HistoricalDataPoint, SimulationResult, Scenario
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "API error")
  }
  return res.json()
}

// ── Geography ────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<{
  counties: County[]
  region_counts: Record<string, number>
}> {
  return apiFetch("/regions")
}

// ── Historical Data ───────────────────────────────────────────────────────────

export async function getHistorical(
  county: string,
  options?: { startYear?: number; endYear?: number; metrics?: string[] }
): Promise<{
  county: string
  region: string
  row_count: number
  data: HistoricalDataPoint[]
}> {
  const params = new URLSearchParams()
  if (options?.startYear) params.set("start_year", String(options.startYear))
  if (options?.endYear)   params.set("end_year",   String(options.endYear))
  if (options?.metrics)   params.set("metrics",    options.metrics.join(","))
  const qs = params.toString() ? `?${params}` : ""
  return apiFetch(`/historical/${encodeURIComponent(county)}${qs}`)
}

export async function compareCounties(
  county: string,
  compareWith: string,
  metric: string,
  startYear?: number
): Promise<{
  metric: string
  counties: string[]
  data: Record<string, number | null>[]
}> {
  const params = new URLSearchParams({ compare_with: compareWith, metric })
  if (startYear) params.set("start_year", String(startYear))
  return apiFetch(`/historical/${encodeURIComponent(county)}/compare?${params}`)
}

// ── Simulation ────────────────────────────────────────────────────────────────

export async function runSimulation(
  county: string,
  unempShock: number,
  horizonMonths = 6
): Promise<SimulationResult> {
  return apiFetch("/simulate", {
    method: "POST",
    body: JSON.stringify({
      county,
      unemp_shock: unempShock,
      horizon_months: horizonMonths,
    }),
  })
}

export async function getScenarios(): Promise<{ scenarios: Scenario[] }> {
  return apiFetch("/simulate/scenarios")
}
