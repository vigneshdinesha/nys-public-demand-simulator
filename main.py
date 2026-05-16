"""
NYS Public Demand & Policy Impact Simulator
Step 7 — FastAPI Backend

Exposes the simulation engine and historical data through REST endpoints
consumable by the Next.js dashboard in Step 8.

Endpoints:
  GET  /                          Health check
  GET  /regions                   List all counties with region assignments
  GET  /counties                  Alias for /regions
  GET  /historical/{county}       Historical time-series for a county
  GET  /historical/{county}/compare  Compare two counties side by side
  POST /simulate                  Run a simulation scenario
  GET  /simulate/scenarios        Pre-built example scenarios

Setup:
  pip install fastapi uvicorn psycopg2-binary sqlalchemy pandas

Run:
  uvicorn main:app --reload --port 8000

API docs (auto-generated):
  http://localhost:8000/docs
"""

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from simulate import SimulationEngine

# ── APP SETUP ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="NYS Public Demand Simulator API",
    description="Simulates the impact of economic changes on NYS public service demand.",
    version="1.0.0",
)

# Allow local dev + any Vercel preview/production deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CONNECTION ────────────────────────────────────────────────────────────────

CONNECTION        = os.environ["DATABASE_URL"]
COEFFICIENTS_PATH = "model_coefficients.csv"

engine_db    = create_engine(CONNECTION, pool_pre_ping=True, pool_recycle=300)
sim_engine   = SimulationEngine(COEFFICIENTS_PATH, CONNECTION)

# ── REGION MAP (mirrors simulate.py) ─────────────────────────────────────────

REGION_MAP = {
    "Bronx": "NYC", "Kings": "NYC", "New York": "NYC",
    "Queens": "NYC", "Richmond": "NYC",
    "Nassau": "Suburban", "Suffolk": "Suburban",
    "Westchester": "Suburban", "Rockland": "Suburban",
    "Putnam": "Suburban", "Orange": "Suburban",
    "Dutchess": "Suburban", "Ulster": "Suburban",
}

def get_region(county: str) -> str:
    return REGION_MAP.get(county, "Upstate")


# ── REQUEST / RESPONSE MODELS ─────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    county:          str   = Field(..., example="Erie",
                                   description="NYS county name")
    unemp_shock:     float = Field(..., example=2.0,
                                   description="Change in unemployment rate (pp). Positive = rise, negative = fall.")
    horizon_months:  int   = Field(6, ge=1, le=24,
                                   description="Months to project baseline trend (1-24)")

class HealthResponse(BaseModel):
    status:  str
    version: str
    message: str


# ── HELPERS ───────────────────────────────────────────────────────────────────

def fetch_counties() -> list[str]:
    with engine_db.connect() as conn:
        result = conn.execute(text(
            "SELECT DISTINCT county FROM nys_unified "
            "WHERE county != 'New York City' ORDER BY county"
        ))
        return [row[0] for row in result]

def fetch_historical(county: str, start_year: int = 2018) -> pd.DataFrame:
    df = pd.read_sql(
        text("""
            SELECT month, year, unemp_rate,
                   medicaid_per_1k, medicaid_enrollment,
                   snap_per_1k, snap_persons,
                   crash_count, crashes_per_100k,
                   mta_ridership, population
            FROM nys_unified
            WHERE county = :county
              AND year >= :start_year
            ORDER BY month
        """),
        engine_db,
        params={"county": county, "start_year": start_year}
    )
    return df


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.get("/", response_model=HealthResponse, tags=["Health"])
def root():
    return {
        "status":  "ok",
        "version": "1.0.0",
        "message": "NYS Public Demand Simulator API is running.",
    }


@app.get("/regions", tags=["Geography"])
def list_regions():
    """
    Returns all NYS counties with their region assignments (NYC / Suburban / Upstate).
    Used by the frontend to populate the county selector.
    """
    counties = fetch_counties()
    return {
        "counties": [
            {
                "county": c,
                "region": get_region(c),
            }
            for c in counties
        ],
        "region_counts": {
            "NYC":      sum(1 for c in counties if get_region(c) == "NYC"),
            "Suburban": sum(1 for c in counties if get_region(c) == "Suburban"),
            "Upstate":  sum(1 for c in counties if get_region(c) == "Upstate"),
        }
    }


@app.get("/counties", tags=["Geography"])
def list_counties():
    """Alias for /regions — returns flat county list."""
    return {"counties": fetch_counties()}


@app.get("/historical/{county}", tags=["Historical Data"])
def get_historical(
    county:     str,
    start_year: int = Query(2018, ge=2018, le=2025, description="Start year"),
    end_year:   int = Query(2025, ge=2018, le=2025, description="End year"),
    metrics:    Optional[str] = Query(
        None,
        description="Comma-separated metrics to include. Options: unemp_rate, medicaid_per_1k, snap_per_1k, crashes_per_100k, mta_ridership"
    )
):
    """
    Returns historical monthly data for a single county.
    Optionally filter to specific metrics and date range.
    """
    counties = fetch_counties()
    if county not in counties:
        raise HTTPException(
            status_code=404,
            detail=f"County '{county}' not found. Use /regions to see valid county names."
        )

    df = fetch_historical(county, start_year)
    df = df[df["year"] <= end_year]

    # Filter to requested metrics
    base_cols = ["month", "year"]
    all_metric_cols = [
        "unemp_rate", "medicaid_per_1k", "medicaid_enrollment",
        "snap_per_1k", "snap_persons",
        "crash_count", "crashes_per_100k",
        "mta_ridership", "population"
    ]
    if metrics:
        requested = [m.strip() for m in metrics.split(",")]
        invalid = [m for m in requested if m not in all_metric_cols]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown metrics: {invalid}. Valid options: {all_metric_cols}"
            )
        selected_cols = base_cols + requested
    else:
        selected_cols = base_cols + all_metric_cols

    df = df[selected_cols]

    # Replace NaN with None for clean JSON
    records = df.replace({np.nan: None}).to_dict(orient="records")

    return {
        "county":      county,
        "region":      get_region(county),
        "start_year":  start_year,
        "end_year":    end_year,
        "row_count":   len(records),
        "data":        records,
    }


@app.get("/historical/{county}/compare", tags=["Historical Data"])
def compare_counties(
    county:        str,
    compare_with:  str = Query(..., description="Second county name to compare against"),
    metric:        str = Query("medicaid_per_1k", description="Metric to compare"),
    start_year:    int = Query(2018, ge=2018),
):
    """
    Returns the same metric for two counties side by side.
    Useful for the frontend comparison view.
    """
    counties = fetch_counties()
    for c in [county, compare_with]:
        if c not in counties:
            raise HTTPException(status_code=404, detail=f"County '{c}' not found.")

    df_a = fetch_historical(county, start_year)[["month", metric]].rename(columns={metric: county})
    df_b = fetch_historical(compare_with, start_year)[["month", metric]].rename(columns={metric: compare_with})

    merged = pd.merge(df_a, df_b, on="month", how="outer").sort_values("month")
    records = merged.replace({np.nan: None}).to_dict(orient="records")

    return {
        "metric":   metric,
        "counties": [county, compare_with],
        "data":     records,
    }


@app.post("/simulate", tags=["Simulation"])
def simulate(request: SimulateRequest):
    """
    Run a simulation scenario.

    Apply an unemployment shock to a county and predict the downstream
    impact on Medicaid enrollment and SNAP caseloads, with confidence
    levels and a baseline trend projection.
    """
    counties = fetch_counties()
    if request.county not in counties:
        raise HTTPException(
            status_code=404,
            detail=f"County '{request.county}' not found. Use /regions to see valid county names."
        )

    if abs(request.unemp_shock) > 20:
        raise HTTPException(
            status_code=400,
            detail="Unemployment shock must be between -20 and +20 percentage points."
        )

    try:
        result = sim_engine.run(
            county=request.county,
            unemp_shock=request.unemp_shock,
            horizon_months=request.horizon_months,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/simulate/scenarios", tags=["Simulation"])
def example_scenarios():
    """
    Returns pre-built example scenarios for the frontend scenario picker.
    These demonstrate the simulator with realistic economic events.
    """
    return {
        "scenarios": [
            {
                "id":          "nyc_recession",
                "label":       "NYC Recession Shock",
                "description": "Models a moderate recession hitting New York City — unemployment rises 3pp.",
                "county":      "Bronx",
                "unemp_shock": 3.0,
            },
            {
                "id":          "upstate_manufacturing",
                "label":       "Upstate Manufacturing Job Loss",
                "description": "Models factory closures in western NY — unemployment rises 2pp in Erie County.",
                "county":      "Erie",
                "unemp_shock": 2.0,
            },
            {
                "id":          "suburban_commuter",
                "label":       "Suburban Commuter Layoffs",
                "description": "Tech/finance sector layoffs affecting Long Island commuters.",
                "county":      "Suffolk",
                "unemp_shock": 1.5,
            },
            {
                "id":          "albany_recovery",
                "label":       "Capital Region Recovery",
                "description": "Government hiring and economic recovery reducing unemployment.",
                "county":      "Albany",
                "unemp_shock": -1.0,
            },
            {
                "id":          "covid_scale",
                "label":       "COVID-Scale Shock (historical reference)",
                "description": "Replicates the 2020 unemployment spike — for comparison with actual data.",
                "county":      "New York",
                "unemp_shock": 4.0,
            },
        ]
    }
