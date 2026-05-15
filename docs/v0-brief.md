# v0 Brief — NYS Demand Simulator UI

Paste this entire document into v0 as your first message.

---

## Product context

Build the UI for a single-page web app called **NYS Demand Simulator**. It's a civic-tech tool that lets county-level planners in New York State estimate, in 30 seconds, how an unemployment shock would ripple into Medicaid and SNAP enrollment demand. Picture a deputy commissioner at NYS OTDA running a scenario before a budget meeting.

Users pick a county, drag a slider for the unemployment shock (in percentage points, "pp"), and the app returns:
- Predicted change in Medicaid enrollment (headcount, % change, 95% confidence interval)
- Predicted change in SNAP enrollment (same)
- Annual budget impact (millions of dollars) and number of additional caseworkers needed
- An **honest confidence tier** — high / moderate / low — that flags when the model is weak
- A historical chart of unemployment vs Medicaid vs SNAP for context
- Plain-language interpretation of what the numbers mean

This is a **portfolio piece for a recent CS+DS grad applying to NY State Software Engineer roles**. Recruiters will see it. It should look professional, finished, and trustworthy — not like a generic AI demo.

## Design direction

- **Light theme only.** Warm off-white background with the faintest hint of color (subtle blue/green gradient washes welcome). Pure white cards. Soft, layered shadows.
- **Airy and modern.** Generous whitespace, rounded corners (12–16px), soft 1px borders. Cards should feel like they're floating.
- **Fun touches.** Tasteful hover animations (cards lift slightly, buttons warm up), micro-interactions when results appear (fade up). A pulsing "live" indicator dot. Pill-shaped chips.
- **Trustworthy color palette.** Friendly blue as accent (#2563EB or similar). Semantic green for positive deltas, soft red for negative, amber for warnings. Confidence badges are core UI — green/amber/red soft pills.
- **Typography.** Inter or similar geometric sans for body, a slightly more characterful display font for big numbers (Syne, Cabinet Grotesk, or whatever feels right). DM Mono for technical labels and stats. Big stats should be big and confident.
- **Feel-references.** Think Linear's clarity, Stripe's data products, Vercel's analytics dashboard. NOT generic Bootstrap admin templates.

## What to build

A single page with:

1. **Header** — App name "NYS Demand Simulator" + a one-line subtitle: _"How unemployment shocks ripple into Medicaid & SNAP demand across all 62 NY counties"_. Status pill showing "6 datasets · 2018–2025" with a pulsing live-dot. Two buttons on the right: "About" and "GitHub".

2. **Scenario builder (left sidebar, ~320px)**
   - **County picker** — searchable dropdown, counties grouped by region (NYC / Suburban / Upstate). Region badge color next to each.
   - **Unemployment shock slider** — range −5 to +10, step 0.5. Show the value big and bold ("+3.0pp"). Include a "what's pp?" hover tooltip explaining percentage points. Live caption: "Unemployment rises by 3 percentage points from current level."
   - **Run Simulation button** — large, primary.
   - **Quick Scenarios list** — 4–5 preset pill-buttons (see mock data below) that fill the form when clicked.

3. **Main results area (right column)**
   - **Historical chart** — line chart of three metrics (unemployment rate %, Medicaid per 1,000, SNAP per 1,000) over 2018–2025. Dual Y-axis (left for per-1000, right for %). Subtle reference line at 2020-03 labeled "COVID". Use Recharts.
   - **Scenario summary bar** — a horizontal info strip showing: "Scenario · Bronx · +3pp unemployment · 7.4% → 10.4% · Pop. 1,406,332 · NYC region · as of 2025-12".
   - **Two prediction cards** (Medicaid Impact + SNAP Impact), side-by-side. Each card has:
     - Confidence badge (top-right pill, green/amber/red)
     - Big delta number ("+92,400 people") in semantic color
     - Sub-line: "+10.22% from current 643.03 per 1k residents"
     - **CI bar** — horizontal segment showing the 95% confidence interval, centered on the prediction
     - **Budget Impact panel** (inset, slightly tinted background): Annual Cost (e.g. "+$942.5M"), Monthly cost, Caseworkers needed (with people icon), and "Share of current budget: +10.22%"
     - Three small stats at the bottom: Current / Predicted / Model R²
     - Confidence note (italic, beneath the badge)
   - **Plain-language interpretation panel** — a card with 4–6 numbered insight bullets explaining what the prediction means in human terms. Footer note: "Model based on NYS county-month panel data 2018–2025. Predictions use OLS regression with heteroskedasticity-robust standard errors. Not for policy decisions without further validation."

4. **About modal** (opens from header button)
   - "About this project" + subtitle "METHODOLOGY · DATA · LIMITATIONS"
   - Section: "What this is" (paragraph framing)
   - Section: "Six datasets, one panel" — grid of six cards naming each dataset and source (see mock data)
   - Section: "Methodology" (paragraph on OLS / regions / autocorrelation)
   - Section: "What this is NOT" (bulleted honest limits) — styled with amber accent

## Tech constraints

- **Next.js 16 (App Router) with TypeScript and Tailwind v4.** Use shadcn/ui where it fits — confident with `Button`, `Card`, `Dialog`, `Select`, `Slider`, `Badge`, `Tooltip`. Keep components small and composable.
- **Use Recharts** for the historical chart.
- **Use mock data inline** — do NOT fetch from an API. The integrator will wire real data.
- Use the exact TypeScript types below so the integrator can drop these components in without renaming fields.
- Components should accept props (don't hardcode the scenario inside the component) so they're reusable.

## Data types (use verbatim)

```ts
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
```

## Mock data (use this to populate the UI on first render)

```ts
const MOCK_COUNTIES: County[] = [
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

const MOCK_SCENARIOS: Scenario[] = [
  { id: "nyc_recession",          label: "NYC Recession Shock",            description: "Models a moderate recession hitting NYC.",              county: "Bronx",    unemp_shock:  3.0 },
  { id: "upstate_manufacturing",  label: "Upstate Manufacturing Job Loss", description: "Models factory closures in western NY.",                county: "Erie",     unemp_shock:  2.0 },
  { id: "suburban_commuter",      label: "Suburban Commuter Layoffs",      description: "Tech/finance layoffs affecting Long Island commuters.", county: "Suffolk",  unemp_shock:  1.5 },
  { id: "albany_recovery",        label: "Capital Region Recovery",        description: "Government hiring and economic recovery.",              county: "Albany",   unemp_shock: -1.0 },
  { id: "covid_scale",            label: "COVID-Scale Shock",              description: "Replicates the 2020 unemployment spike.",               county: "New York", unemp_shock:  4.0 },
]

const MOCK_SIMULATION: SimulationResult = {
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

// Twelve sample monthly historical points (extend for a smoother chart)
const MOCK_HISTORICAL: HistoricalDataPoint[] = [
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

const MOCK_INSIGHTS = [
  "A 3pp rise in unemployment in Bronx — from 7.4% to 10.4% — would affect a county of 1,406,332 residents as follows.",
  "Medicaid enrollment is expected to increase by approximately 92,400 people (10.22%). This estimate is based on a statistically significant historical relationship between unemployment and Medicaid demand in NYC-region counties (R²=0.22).",
  "At the blended statewide Medicaid cost of $850/enrollee/month, this translates to a +$942.5M/year budget impact (10.22% of the county's current Medicaid expenditure). Note: new enrollees during economic downturns tend to be younger and healthier, so actual per-enrollee costs are likely below the blended average.",
  "SNAP enrollment is expected to increase by approximately 38,800 people. SNAP eligibility is more directly income-tied than Medicaid, making it a more responsive indicator of short-term economic shocks.",
  "A 3pp shock is comparable in magnitude to the unemployment increase seen during the 2008 financial crisis. During COVID-19, NYS unemployment rose by approximately 4pp in a single quarter — the largest single shock in the dataset.",
  "Note: These predictions represent the additional impact of the unemployment shock above the existing baseline trajectory. Monthly enrollment is highly autocorrelated.",
]

const MOCK_DATA_SOURCES = [
  { label: "Unemployment",      source: "NYS Dept. of Labor (LAUS)" },
  { label: "Medicaid",          source: "NYS DOH — extracted from monthly PDFs" },
  { label: "SNAP",              source: "NYS OTDA caseload data" },
  { label: "Crashes",           source: "NYSDOT four-year window" },
  { label: "Transit ridership", source: "MTA monthly ridership" },
  { label: "Population",        source: "U.S. Census Bureau" },
]
```

## Deliverable

A single Next.js page (`app/page.tsx`) plus the reusable components it imports (one file per component is great). On first render the page should display the Bronx +3pp scenario fully populated using the mock data above — no empty states needed for the headline view.

Make it feel like something a real NY State agency would proudly hand to a deputy commissioner.
