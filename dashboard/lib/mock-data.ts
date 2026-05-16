import type { County, Scenario, SimulationResult, HistoricalDataPoint } from "./types"

export const MOCK_COUNTIES: County[] = [
  { county: "Bronx", region: "NYC" },
  { county: "Kings", region: "NYC" },
  { county: "New York", region: "NYC" },
  { county: "Queens", region: "NYC" },
  { county: "Richmond", region: "NYC" },
  { county: "Nassau", region: "Suburban" },
  { county: "Suffolk", region: "Suburban" },
  { county: "Westchester", region: "Suburban" },
  { county: "Erie", region: "Upstate" },
  { county: "Monroe", region: "Upstate" },
  { county: "Albany", region: "Upstate" },
  { county: "Onondaga", region: "Upstate" },
]

export const MOCK_SCENARIOS: Scenario[] = [
  { id: "nyc_recession", label: "NYC Recession Shock", description: "Models a moderate recession hitting NYC.", county: "Bronx", unemp_shock: 3.0 },
  { id: "upstate_manufacturing", label: "Upstate Manufacturing Job Loss", description: "Models factory closures in western NY.", county: "Erie", unemp_shock: 2.0 },
  { id: "suburban_commuter", label: "Suburban Commuter Layoffs", description: "Tech/finance layoffs affecting Long Island commuters.", county: "Suffolk", unemp_shock: 1.5 },
  { id: "albany_recovery", label: "Capital Region Recovery", description: "Government hiring and economic recovery.", county: "Albany", unemp_shock: -1.0 },
  { id: "covid_scale", label: "COVID-Scale Shock", description: "Replicates the 2020 unemployment spike.", county: "New York", unemp_shock: 4.0 },
]

export const MOCK_SIMULATION: SimulationResult = {
  county: "Bronx",
  region: "NYC",
  as_of_month: "2025-12",
  unemp_shock_pp: 3.0,
  current_unemp: 7.4,
  shocked_unemp: 10.4,
  population: 1406332,
  predictions: {
    medicaid: {
      target: "medicaid_per_1k",
      current_per_1k: 643.03,
      predicted_per_1k: 708.73,
      delta_per_1k: 65.7,
      delta_per_1k_ci: [50.08, 81.32],
      delta_headcount: 92400,
      delta_headcount_ci: [70433, 114366],
      pct_change: 10.22,
      confidence: "high",
      confidence_note: "High confidence — strong historical signal (R²=0.22, p<0.001)",
      model_r2: 0.2159,
      model_pvalue: 0.0,
      cost_impact: {
        annual_cost: 942476723,
        annual_cost_ci: [718420509, 1166532937],
        monthly_cost: 78539727,
        cost_per_enrollee_mo: 850,
        caseworkers_needed: 308,
        pct_of_current_cost: 10.22,
        caveat: "Uses blended per-enrollee cost ($850/mo). Recession-driven enrollment skews younger and healthier, so actual per-enrollee costs are likely below the blended average.",
      },
    },
    snap: {
      target: "snap_per_1k",
      current_per_1k: 220.5,
      predicted_per_1k: 248.1,
      delta_per_1k: 27.6,
      delta_per_1k_ci: [18.2, 37.0],
      delta_headcount: 38800,
      delta_headcount_ci: [25600, 52000],
      pct_change: 12.5,
      confidence: "moderate",
      confidence_note: "Moderate confidence — SNAP eligibility is more directly income-tied than Medicaid, but R²=0.18 leaves meaningful uncertainty.",
      model_r2: 0.18,
      model_pvalue: 0.001,
      cost_impact: {
        annual_cost: 89856000,
        annual_cost_ci: [59290000, 120422000],
        monthly_cost: 7488000,
        cost_per_person_mo: 193,
        caseworkers_needed: 129,
        pct_of_current_cost: 12.5,
        caveat: "Uses Bronx's actual average SNAP benefit of $193/person/month.",
      },
    },
  },
  warnings: [],
}

export const MOCK_HISTORICAL: HistoricalDataPoint[] = [
  { month: "2018-01-01", year: 2018, unemp_rate: 5.5, medicaid_per_1k: 580, snap_per_1k: 240 },
  { month: "2018-06-01", year: 2018, unemp_rate: 5.2, medicaid_per_1k: 585, snap_per_1k: 238 },
  { month: "2019-01-01", year: 2019, unemp_rate: 4.8, medicaid_per_1k: 590, snap_per_1k: 235 },
  { month: "2019-06-01", year: 2019, unemp_rate: 4.5, medicaid_per_1k: 595, snap_per_1k: 232 },
  { month: "2020-01-01", year: 2020, unemp_rate: 4.3, medicaid_per_1k: 605, snap_per_1k: 230 },
  { month: "2020-04-01", year: 2020, unemp_rate: 17.2, medicaid_per_1k: 640, snap_per_1k: 260 },
  { month: "2020-12-01", year: 2020, unemp_rate: 12.5, medicaid_per_1k: 670, snap_per_1k: 270 },
  { month: "2021-06-01", year: 2021, unemp_rate: 9.0, medicaid_per_1k: 685, snap_per_1k: 255 },
  { month: "2022-01-01", year: 2022, unemp_rate: 6.5, medicaid_per_1k: 700, snap_per_1k: 240 },
  { month: "2023-01-01", year: 2023, unemp_rate: 6.8, medicaid_per_1k: 715, snap_per_1k: 232 },
  { month: "2024-01-01", year: 2024, unemp_rate: 7.0, medicaid_per_1k: 720, snap_per_1k: 225 },
  { month: "2025-12-01", year: 2025, unemp_rate: 7.4, medicaid_per_1k: 643, snap_per_1k: 220 },
]

export const MOCK_INSIGHTS = [
  "A 3pp rise in unemployment in Bronx — from 7.4% to 10.4% — would affect a county of 1,406,332 residents as follows.",
  "Medicaid enrollment is expected to increase by approximately 92,400 people (10.22%). This estimate is based on a statistically significant historical relationship between unemployment and Medicaid demand in NYC-region counties (R²=0.22).",
  "At the blended statewide Medicaid cost of $850/enrollee/month, this translates to a +$942.5M/year budget impact (10.22% of the county's current Medicaid expenditure). Note: new enrollees during economic downturns tend to be younger and healthier, so actual per-enrollee costs are likely below the blended average.",
  "SNAP enrollment is expected to increase by approximately 38,800 people. SNAP eligibility is more directly income-tied than Medicaid, making it a more responsive indicator of short-term economic shocks.",
  "A 3pp shock is comparable in magnitude to the unemployment increase seen during the 2008 financial crisis. During COVID-19, NYS unemployment rose by approximately 4pp in a single quarter — the largest single shock in the dataset.",
  "Note: These predictions represent the additional impact of the unemployment shock above the existing baseline trajectory. Monthly enrollment is highly autocorrelated.",
]

export const MOCK_DATA_SOURCES = [
  { label: "Unemployment", source: "NYS Dept. of Labor (LAUS)" },
  { label: "Medicaid", source: "NYS DOH — extracted from monthly PDFs" },
  { label: "SNAP", source: "NYS OTDA caseload data" },
  { label: "Crashes", source: "NYSDOT four-year window" },
  { label: "Transit ridership", source: "MTA monthly ridership" },
  { label: "Population", source: "U.S. Census Bureau" },
]
