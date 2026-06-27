// lib/api.ts — typed API client for the NYS Demand Simulator FastAPI backend
//
// The API runs on Render's free tier, which spins the service down after
// inactivity. The first request after a sleep triggers a cold boot that can
// take 30–60s, during which requests fail with network errors or 502/503/504.
// To keep the UI from looking broken, apiFetch transparently retries those
// transient failures with backoff. Real client/server errors (400/404/500
// with a JSON detail) are NOT retried — they throw immediately.

import type {
  County, HistoricalDataPoint, SimulationResult, Scenario
} from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// Cold-start tolerance: ~8 attempts × (up to 18s each + 4s backoff) ≈ 90s headroom.
const COLD_START_RETRIES = 8
const RETRY_DELAY_MS = 4000
const ATTEMPT_TIMEOUT_MS = 18000
const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isRetryableError(err: unknown): boolean {
  // AbortError (our timeout) or a TypeError from fetch (network down / DNS /
  // CORS preflight while the box is still booting) — both mean "try again".
  if (err instanceof DOMException && err.name === "AbortError") return true
  if (err instanceof TypeError) return true
  return false
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  retries: number = COLD_START_RETRIES,
): Promise<T> {
  let lastError: unknown = new Error("API request failed")

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...options,
      })
      clearTimeout(timer)

      if (res.ok) return res.json()

      // Gateway/throttle codes = server still waking up → retry.
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        lastError = new Error(`Server warming up (${res.status})`)
        await sleep(RETRY_DELAY_MS)
        continue
      }

      // Genuine error response — surface it, don't retry.
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail ?? "API error")
    } catch (e) {
      clearTimeout(timer)
      if (attempt < retries && isRetryableError(e)) {
        lastError = e
        await sleep(RETRY_DELAY_MS)
        continue
      }
      throw e
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/**
 * Wakes the API and resolves once it answers its health check.
 * Used on first load to show a "warming up" screen instead of a broken shell.
 */
export async function wakeApi(): Promise<void> {
  await apiFetch<{ status: string }>("/")
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
