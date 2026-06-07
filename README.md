# NYS Public Demand Simulator

A 30-second forecasting tool for New York State county planners. Pick a county, set an unemployment shock (e.g. "+3 points in Bronx"), get back predicted Medicaid and SNAP enrollment changes with confidence intervals, budget impact, and a caseworker estimate.

Live at **[nys-public-demand-simulator.vercel.app](https://nys-public-demand-simulator.vercel.app)**.

[![demo loom](https://img.shields.io/badge/demo-loom-blue)](https://www.loom.com/) <!-- replace with actual Loom URL when posted -->

---

## Why it exists

Most NY counties don't have in-house data science staff. When unemployment shifts, planners need to guess how much demand is about to hit Medicaid and SNAP so they can staff and budget. Today that means either an actuary builds a model over weeks, or someone sketches a spreadsheet by hand. This is the 30-second version.

The data side was the hard part. Five of the six datasets I needed were ordinary downloads. The sixth — county-level Medicaid enrollment — only exists as monthly PDF reports from the Department of Health. I wrote an extraction pipeline for those (98 monthly PDFs, 2018 through early 2026) so the dataset actually exists in queryable form.

## Numbers, honest

- **Raw inputs:** ~1.64M rows across NYSDOT crashes (1.5M), NYS LAUS unemployment (94k), NYS OTDA SNAP (17k), Medicaid (6k from 98 PDFs), MTA ridership (~1k), Census ACS (~500). About 343 MB on disk.
- **Unified panel after clean + join:** **6,048 rows × 13 fields** — 62 counties + a NYC roll-up, monthly Jan 2018 through Dec 2025 (96 months).
- **Models:** region-segmented OLS (NYC / Suburban / Upstate) with HC3-robust standard errors. NYC Medicaid is R² ≈ 0.22, coefficient highly significant (p<0.001). Suburban and Upstate Medicaid don't show a significant unemployment signal — and the UI says so.
- **Diagnostics committed:** Durbin-Watson, Breusch-Pagan, Shapiro-Wilk results in the repo.

## What's interesting under the hood

`etl.py` is the ingestion + clean + load. The Medicaid path runs `tabula` on each monthly PDF, regex-parses the two side-by-side county columns, normalizes the county names (Kings → Brooklyn and so on), and writes the time series through a validation harness that fails loudly if a month is missing a county or shows a >25% month-over-month jump.

`regression.py` fits the three region-specific models, runs the full diagnostic suite, and dumps `model_coefficients.csv` + `region_models.pkl` for the API to load. Standard errors are HC3 because Breusch-Pagan flagged heteroskedasticity in NYC and Upstate Medicaid.

`simulate.py` wraps the models in a `SimulationEngine` class. Confidence tiering (`CONFIDENCE_RULES`) labels every prediction high / moderate / low based on the underlying model's p-value and R², and the UI surfaces a plain-language warning next to any prediction the model can't support — e.g. "unemployment is not a significant predictor of Medicaid in this region." This is the part I'd keep even at the cost of looking less impressive.

`api.py` is FastAPI with pydantic request validation, auto-generated OpenAPI docs at `/docs`, and four endpoints: `/regions`, `/historical/{county}`, `/simulate`, `/simulate/scenarios`.

The frontend is Next.js + TypeScript + Tailwind + Recharts: county selector grouped by region, scenario slider, dual-axis historical chart with a COVID reference line, a results panel that shows the change with a confidence-tier badge, and a plain-language interpretation block.

## What it isn't

This is a planning sketch, not a forecasting system. R² peaks at about 0.22 because monthly enrollment is dominated by autocorrelation (last month predicts this month), not by unemployment. The job here is to isolate the marginal effect of a shock on top of the existing trajectory — not to explain the level. A higher R² on this data would be a red flag for leakage.

The model uses unemployment, a time trend, a COVID dummy, and monthly seasonal terms. Crashes and MTA ridership are in the panel for cross-metric exploration in `analysis.py`, but they're deliberately not features in the simulator — I checked, they didn't add predictive power, and I'd rather scope honestly than load up.

Inference soft spot: Durbin-Watson on these models sits around 0.03–0.10. HC3 doesn't correct for autocorrelation. The honest next step for inference is HAC / Newey-West standard errors or modeling the AR error structure directly. I scoped that out of v1 because the confidence tiering already prevents users from over-trusting the intervals, but I know exactly where the inferential gap is.

## Stack

Python · pandas · tabula · statsmodels · joblib · SQLAlchemy · PostgreSQL (Neon) · FastAPI · pydantic · uvicorn  ·  Next.js · TypeScript · Tailwind · Recharts  ·  Vercel (frontend) · Render (API) · Neon (database)

## Running locally

You'll need Python 3.11+ and Node 20+. From the repo root:

```bash
# backend
cd api
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL
python -m uvicorn app:app --reload --port 8000

# frontend (in another shell)
cd web
npm install
npm run dev
```

The frontend talks to `http://localhost:8000` by default; change `NEXT_PUBLIC_API_BASE` if you point it elsewhere.

To rebuild the panel from raw inputs, run `python etl.py` (expects the raw files in `data/raw/`, which are not in the repo — they're 343 MB and the sources are linked in `data/SOURCES.md`).

## What's next

- HAC / Newey-West standard errors for honest inference
- Time-split backtest before I can call any of this predictive
- A small automated test suite around the PDF extractor (right now its safety net is the validation harness, which runs after the fact)
- Maybe bringing crash + transit data in as candidate features with proper selection rather than as context

## Data sources

All public. Full list with links in [`data/SOURCES.md`](data/SOURCES.md). Synthetic / no PII at any point.

## License

MIT — use the code, please don't claim my analysis as yours.
