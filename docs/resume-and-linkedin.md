# Resume + LinkedIn copy — NYS Public Demand Simulator

Use what fits. The bullets are written for an SWE role at NY State.

---

## Resume — Project section

**NYS Public Demand & Policy Impact Simulator** &nbsp;·&nbsp; _Personal project_ &nbsp;·&nbsp; [github.com/vigneshdinesha/nys-public-demand-simulator](https://github.com/vigneshdinesha/nys-public-demand-simulator)

_Python · TypeScript · FastAPI · PostgreSQL · Next.js · statsmodels · Recharts_

### Strongest 3–4 bullets (pick what fits your space)

- Built an end-to-end civic-tech tool that integrates **six fragmented NYS public datasets** (unemployment, Medicaid, SNAP, crashes, MTA ridership, Census) into a single queryable panel of **~67,000 county-month observations across 88 columns (2018–2025)** — a join that had never existed before — and exposes it through a regression-based simulator and an interactive web dashboard.
- Engineered a custom ingestion pipeline that **extracts county-level Medicaid enrollment from unstructured NYS DOH PDF reports**, applies data-quality validation, and transforms it into a structured, auditable time series — solving a gap where the dataset was not published in machine-readable form.
- Shipped a **full-stack web application** (Next.js + TypeScript + Tailwind frontend, FastAPI + SQLAlchemy + PostgreSQL backend on Neon) that lets a county-level planner estimate the Medicaid/SNAP demand impact of an unemployment shock in under 30 seconds — including budget impact, caseworker staffing implications, and 95% confidence intervals.
- Designed region-specific OLS regression models (NYC / Suburban / Upstate) with heteroskedasticity-robust standard errors and surfaced **explicit confidence tiering** (high / moderate / low) in the UI so users see model uncertainty rather than false precision.

### Alternate bullets to swap in

- Productionized a typed REST API (FastAPI + pydantic) serving simulation, historical time-series, and scenario-preset endpoints; consumed by a Next.js dashboard with searchable region-grouped county selector, scenario slider, dual-Y-axis time-series chart, and plain-language interpretation panel.
- Authored data-source documentation, environment-variable-based secret management, and full reproducibility instructions so a third party can rebuild the panel and run the simulator end-to-end from a clean machine.

### One-liner version (if you only have room for one bullet anywhere)

- Built and open-sourced a full-stack web app that integrates six NYS public datasets — including a custom PDF-to-structured pipeline for Medicaid enrollment — to let any county-level planner estimate Medicaid and SNAP demand impacts of unemployment shocks in 30 seconds, with honest model-confidence surfacing throughout. _([repo](https://github.com/vigneshdinesha/nys-public-demand-simulator))_

---

## LinkedIn — Featured-project description

_Use as the long description on a LinkedIn "Project" entry, or as a post when announcing the repo._

### Title
**NYS Public Demand & Policy Impact Simulator**

### Subtitle / short description
A self-service analytics tool that estimates how unemployment shocks ripple into Medicaid and SNAP enrollment across all 62 NY counties — built on six integrated NYS public datasets, including a custom PDF-extraction pipeline for Medicaid data that didn't exist in structured form.

### Long description

I built this as a portfolio project to demonstrate that I can take a real public-policy problem all the way from messy government data to a usable web product.

🛠️ **The engineering**
- Six NYS datasets (unemployment, Medicaid, SNAP, crashes, MTA ridership, Census) — fragmented across portals, with different geographic granularities, never joined before
- A custom ingestion pipeline that pulls county-level Medicaid enrollment out of monthly NYS DOH PDF reports and turns it into a structured, validated, auditable time series
- A unified panel of ~67k county-month observations × 88 columns (2018–2025), loaded to PostgreSQL
- Region-specific OLS regression models (NYC / Suburban / Upstate), with heteroskedasticity-robust standard errors and explicit honest-uncertainty surfacing
- FastAPI backend exposing simulation, historical, and scenario endpoints
- Next.js + TypeScript dashboard with scenario slider, dual-axis historical chart, budget-impact + caseworker estimates, and a confidence tier badge on every prediction

📊 **What it does**
A county-level planner picks a county, sets an unemployment shock (e.g. "+3 percentage points in Bronx"), and gets back: predicted Medicaid + SNAP enrollment changes, 95% confidence intervals, annual budget impact, additional caseworkers needed, and a plain-language interpretation. In 30 seconds.

🚧 **What it isn't**
Not a forecasting system (R² peaks at ~0.22), not an actuarial replacement, and not equally reliable across every county. The UI says so explicitly — Upstate Medicaid signals are weak and the app flags them as low confidence. Honest modeling matters more than slick modeling.

🔗 Repo: github.com/vigneshdinesha/nys-public-demand-simulator

Open to feedback, collaboration, and conversations about civic tech, SWE roles, and applied data products.

---

## LinkedIn — Short post (for an "I built this" announcement)

> Just shipped a portfolio project: a tool that lets any NY State county-level planner estimate how an unemployment shock would ripple into Medicaid and SNAP demand — in 30 seconds, without building a spreadsheet from scratch.
>
> The actually-interesting part isn't the regression. It's that **county-level Medicaid enrollment isn't published as structured data anywhere** — it's locked inside per-month NYS DOH PDF reports. So I built an end-to-end ingestion pipeline that extracts, validates, and normalizes it. The whole project is essentially a thin layer over a dataset that didn't exist before.
>
> Full stack: Python ETL + PostgreSQL + FastAPI + Next.js + TypeScript. Honest about its limits — R² ~0.22, confidence tiering surfaced in the UI, no false precision.
>
> 🔗 https://github.com/vigneshdinesha/nys-public-demand-simulator

---

## Tips for sending to the recruiter

1. **Lead with the repo link in your message** — recruiters want one click.
2. **Mention NYS data explicitly** in the email. If they're hiring for State of NY, this is a signal you're already thinking about their domain.
3. **Pre-empt the "is this resume-padding?" reaction** by naming the hardest engineering piece (Medicaid PDF pipeline) in your one-sentence pitch.
4. **Don't over-claim** — call it a portfolio piece / demo, not a production system. The honest framing is part of the value.
