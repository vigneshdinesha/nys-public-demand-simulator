"""
NYS Public Demand & Policy Impact Simulator
ETL Pipeline — cleans and merges all six source datasets into one
unified analytical table ready for PostgreSQL ingestion.

Output table columns:
  county | month | unemp_rate | medicaid_enrollment | snap_persons
  snap_benefits | crash_count | mta_ridership | population
  medicaid_per_1k | snap_per_1k | crashes_per_100k

Usage:
  1. Set your file paths in the PATHS dict below
  2. Run: python etl.py
  3. Inspect nys_unified.csv
  4. Load to PostgreSQL with psycopg2 (see bottom of file)
"""

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np

# ── 0. FILE PATHS ────────────────────────────────────────────────────────────

PATHS = {
    "unemployment": "data/raw/Local_Area_Unemployment_Statistics__Beginning_1976_20260401.csv",
    "medicaid":     "data/raw/******medicaid_enrollment.csv",
    "snap":         "data/raw/**********Supplemental_Nutrition_Assistance_Program_(SNAP)_Caseloads_and_Expenditures__Beginning_2002_20260411.csv",
    "crashes":      "data/raw/*************Motor_Vehicle_Crashes_-_Case_Information__Four_Year_Window_20260407.csv",
    "mta":          "data/raw/*******MTA_Monthly_Ridership___Traffic_Data__Beginning_January_2008_20260406.csv",
    "population":   "data/raw/********population.csv",
}

# NYC borough names as they appear in the Medicaid dataset
NYC_BOROUGHS = ["Bronx", "Kings", "New York", "Queens", "Richmond"]

# MTA agencies to include for total ridership
# Subway + NYCT Bus + MTA Bus covers the core NYC transit network
MTA_AGENCIES = ["Subway", "NYCT Bus", "MTA Bus"]

# Analysis window — driven by Medicaid coverage
YEAR_START = 2018
YEAR_END   = 2025


# ── 1. UNEMPLOYMENT ──────────────────────────────────────────────────────────

def clean_unemployment(path: str) -> pd.DataFrame:
    """
    Source: NYS Dept of Labor — Local Area Unemployment Statistics
    Granularity: county × month
    Key output: unemp_rate (float)
    """
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]

    # County-level rows only (drop state and sub-county geographies)
    df = df[df["Area"].str.contains("County", na=False)].copy()

    # Clean county name: "Albany County" → "Albany"
    df["county"] = df["Area"].str.replace(" County", "", regex=False).str.strip()

    # Build YYYY-MM month key
    df["month"] = (
        df["Year"].astype(str) + "-" +
        df["Month"].astype(str).str.zfill(2)
    )

    # Parse unemployment rate: "4.6%" → 4.6
    df["unemp_rate"] = (
        df["Unemployment Rate"]
        .str.replace("%", "", regex=False)
        .str.strip()
        .astype(float)
    )

    # Filter to analysis window
    df = df[(df["Year"] >= YEAR_START) & (df["Year"] <= YEAR_END)]

    return df[["county", "month", "unemp_rate"]].reset_index(drop=True)


# ── 2. MEDICAID ───────────────────────────────────────────────────────────────

def clean_medicaid(path: str) -> pd.DataFrame:
    """
    Source: NYS DOH — Monthly Medicaid Enrollment by County
    Granularity: county × month (62 counties including NYC boroughs)
    Key output: medicaid_enrollment (int)
    """
    df = pd.read_csv(path)

    # Already clean — county, month (YYYY-MM), enrollment
    df["year"] = df["month"].str[:4].astype(int)
    df = df[(df["year"] >= YEAR_START) & (df["year"] <= YEAR_END)]

    return df[["county", "month", "enrollment"]].rename(
        columns={"enrollment": "medicaid_enrollment"}
    ).reset_index(drop=True)


# ── 3. SNAP ───────────────────────────────────────────────────────────────────

def clean_snap(path: str) -> pd.DataFrame:
    """
    Source: NYS OTDA — SNAP Caseloads and Expenditures
    Granularity: district × month (57 counties + NYC as one district)
    Key outputs: snap_persons (int), snap_benefits (float)

    NYC strategy: SNAP has NYC as one district. We create a single
    'New York City' county row. Medicaid will later be aggregated
    to match for NYC-level analysis.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]

    # Build YYYY-MM month key from Year + Month Code
    df["month"] = (
        df["Year"].astype(str) + "-" +
        df["Month Code"].astype(str).str.zfill(2)
    )

    # Rename District → county (NYC district stays as "New York City")
    df = df.rename(columns={"District": "county"})

    # Strip commas from numeric string columns
    for col in ["Total SNAP Persons", "Total SNAP Benefits"]:
        df[col] = (
            df[col].astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
            .replace("nan", np.nan)
            .astype(float)
        )

    # Filter to analysis window
    df = df[(df["Year"] >= YEAR_START) & (df["Year"] <= YEAR_END)]

    return df[["county", "month", "Total SNAP Persons", "Total SNAP Benefits"]].rename(
        columns={
            "Total SNAP Persons":  "snap_persons",
            "Total SNAP Benefits": "snap_benefits",
        }
    ).reset_index(drop=True)


# ── 4. CRASHES ────────────────────────────────────────────────────────────────

def clean_crashes(path: str) -> pd.DataFrame:
    """
    Source: NYSDOT — Motor Vehicle Crashes Case Information
    Granularity: incident-level → aggregated to county × month
    Key output: crash_count (int)
    """
    df = pd.read_csv(path, low_memory=False)
    df.columns = [c.strip() for c in df.columns]

    # Normalize county names to title case; drop Unknown
    df["county"] = df["County Name"].str.title().str.strip()
    df = df[df["county"] != "Unknown"].copy()

    # Parse date → YYYY-MM
    df["month"] = pd.to_datetime(df["Date"], format="%m/%d/%Y", errors="coerce").dt.strftime("%Y-%m")
    df = df.dropna(subset=["month"])

    # Filter to analysis window
    df["year"] = df["month"].str[:4].astype(int)
    df = df[(df["year"] >= YEAR_START) & (df["year"] <= YEAR_END)]

    # Aggregate to county × month crash count
    crashes_agg = (
        df.groupby(["county", "month"])
        .size()
        .reset_index(name="crash_count")
    )

    return crashes_agg


# ── 5. MTA RIDERSHIP ──────────────────────────────────────────────────────────

def clean_mta(path: str) -> pd.DataFrame:
    """
    Source: MTA — Monthly Ridership & Traffic Data
    Granularity: agency × month → aggregated to single monthly total
    Key output: mta_ridership (int)

    Note: MTA covers NYC metro only. Ridership is summed across
    Subway + NYCT Bus + MTA Bus and assigned to 'New York City'
    as a geography — matching the SNAP NYC district approach.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]

    # Filter to selected agencies
    df = df[df["Agency"].isin(MTA_AGENCIES)].copy()

    # Parse ridership: "94,642,918" → 94642918
    df["Ridership"] = (
        df["Ridership"].astype(str)
        .str.replace(",", "", regex=False)
        .str.strip()
        .astype(float)
    )

    # Normalize month to YYYY-MM
    df["month"] = pd.to_datetime(df["Month"]).dt.strftime("%Y-%m")
    df["year"] = df["month"].str[:4].astype(int)
    df = df[(df["year"] >= YEAR_START) & (df["year"] <= YEAR_END)]

    # Sum all selected agencies per month
    mta_agg = (
        df.groupby("month")["Ridership"]
        .sum()
        .reset_index()
        .rename(columns={"Ridership": "mta_ridership"})
    )

    # Assign to NYC geography to match SNAP district
    mta_agg["county"] = "New York City"

    return mta_agg[["county", "month", "mta_ridership"]]


# ── 6. POPULATION ─────────────────────────────────────────────────────────────

def clean_population(path: str) -> pd.DataFrame:
    """
    Source: US Census Bureau — Annual County Population Estimates
    Granularity: county × year (annual — joined to monthly data by year)
    Key output: population (int)

    NYC strategy: aggregate five borough populations into one
    'New York City' total to match SNAP district geography.
    """
    df = pd.read_csv(path)
    df.columns = [c.strip() for c in df.columns]

    df = df[(df["year"] >= YEAR_START) & (df["year"] <= YEAR_END)].copy()

    # Create NYC aggregate row
    nyc = (
        df[df["county"].isin(NYC_BOROUGHS)]
        .groupby("year")["population"]
        .sum()
        .reset_index()
    )
    nyc["county"] = "New York City"

    # Append NYC aggregate and keep individual boroughs for Medicaid joins
    df = pd.concat([df, nyc], ignore_index=True)

    return df[["county", "year", "population"]]


# ── 7. MERGE ALL DATASETS ─────────────────────────────────────────────────────

def build_unified_table(paths: dict) -> pd.DataFrame:
    """
    Merges all cleaned datasets into one analytical fact table.
    One row per county × month.

    Join strategy:
    - Base: Medicaid (all 62 counties, all months)
    - Unemployment: inner join — same 62 counties
    - SNAP: left join — NYC boroughs aggregated to 'New York City'
    - Crashes: left join — 2021-2024 only, NaN outside that window
    - MTA: left join — NYC only, NaN for all other counties
    - Population: left join on county + year
    """

    print("Loading and cleaning datasets...")
    unemployment = clean_unemployment(paths["unemployment"])
    medicaid     = clean_medicaid(paths["medicaid"])
    snap         = clean_snap(paths["snap"])
    crashes      = clean_crashes(paths["crashes"])
    mta          = clean_mta(paths["mta"])
    population   = clean_population(paths["population"])

    print("  ✓ All datasets cleaned")

    # ── Aggregate Medicaid NYC boroughs → 'New York City' for SNAP/MTA joins
    medicaid_nyc = (
        medicaid[medicaid["county"].isin(NYC_BOROUGHS)]
        .groupby("month")["medicaid_enrollment"]
        .sum()
        .reset_index()
    )
    medicaid_nyc["county"] = "New York City"

    # Full medicaid: individual counties + NYC aggregate
    medicaid_full = pd.concat(
        [medicaid, medicaid_nyc], ignore_index=True
    )

    # ── Start with Medicaid as base
    base = medicaid_full.copy()
    base["year"] = base["month"].str[:4].astype(int)

    # ── Join unemployment (county × month)
    base = base.merge(unemployment, on=["county", "month"], how="left")

    # ── Join SNAP (district × month — includes 'New York City')
    # For individual NYC boroughs, SNAP is null (borough-level SNAP not available)
    base = base.merge(snap, on=["county", "month"], how="left")

    # ── Join crashes (county × month, 2021-2024 only)
    base = base.merge(crashes, on=["county", "month"], how="left")

    # ── Join MTA (NYC only, month)
    base = base.merge(mta, on=["county", "month"], how="left")

    # ── Join population (county × year)
    base = base.merge(population, on=["county", "year"], how="left")

    # ── Per capita normalization
    base["medicaid_per_1k"]  = (base["medicaid_enrollment"] / base["population"] * 1000).round(2)
    base["snap_per_1k"]      = (base["snap_persons"] / base["population"] * 1000).round(2)
    base["crashes_per_100k"] = (base["crash_count"] / base["population"] * 100000).round(2)

    # ── Final column order
    cols = [
        "county", "month", "year",
        "unemp_rate",
        "medicaid_enrollment", "medicaid_per_1k",
        "snap_persons", "snap_benefits", "snap_per_1k",
        "crash_count", "crashes_per_100k",
        "mta_ridership",
        "population",
    ]
    base = base[cols].sort_values(["county", "month"]).reset_index(drop=True)

    print(f"  ✓ Unified table built: {base.shape[0]:,} rows × {base.shape[1]} columns")
    return base


# ── 8. SUMMARY REPORT ─────────────────────────────────────────────────────────

def print_summary(df: pd.DataFrame):
    print("\n" + "="*60)
    print("  UNIFIED DATASET SUMMARY")
    print("="*60)
    print(f"  Rows:     {df.shape[0]:,}")
    print(f"  Columns:  {df.shape[1]}")
    print(f"  Counties: {df['county'].nunique()}")
    print(f"  Months:   {df['month'].min()} → {df['month'].max()}")
    print(f"\n  Null counts per column:")
    for col in df.columns:
        n = df[col].isnull().sum()
        pct = n / len(df) * 100
        flag = "  ← expected (limited coverage)" if pct > 0 else ""
        print(f"    {col:<25} {n:>6} ({pct:5.1f}%){flag}")
    print(f"\n  Sample rows (Albany):")
    print(df[df["county"] == "Albany"].head(3).to_string(index=False))


# ── 9. POSTGRESQL LOADER ──────────────────────────────────────────────────────

def load_to_postgres(df: pd.DataFrame, connection_string: str):
    """
    Loads the unified table to PostgreSQL.
    Requires: pip install psycopg2-binary sqlalchemy

    connection_string format:
      postgresql://user:password@host:5432/dbname
      (paste your Neon connection string here)
    """
    from sqlalchemy import create_engine, text

    engine = create_engine(connection_string)

    # Create schema
    create_sql = text("""
    CREATE TABLE IF NOT EXISTS nys_unified (
        county               TEXT        NOT NULL,
        month                CHAR(7)     NOT NULL,
        year                 SMALLINT    NOT NULL,
        unemp_rate           NUMERIC(5,2),
        medicaid_enrollment  INTEGER,
        medicaid_per_1k      NUMERIC(8,2),
        snap_persons         INTEGER,
        snap_benefits        NUMERIC(14,2),
        snap_per_1k          NUMERIC(8,2),
        crash_count          INTEGER,
        crashes_per_100k     NUMERIC(8,2),
        mta_ridership        BIGINT,
        population           INTEGER,
        PRIMARY KEY (county, month)
    );
    """)
    with engine.connect() as conn:
        conn.execute(create_sql)
        conn.commit()

    df.to_sql(
        "nys_unified",
        engine,
        if_exists="replace",
        index=False,
        method="multi",
        chunksize=500,
    )
    print(f"\n  ✓ Loaded {len(df):,} rows to PostgreSQL table 'nys_unified'")


# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    df = build_unified_table(PATHS)
    print_summary(df)

    # Save locally as CSV backup
    df.to_csv("data/outputs/nys_unified.csv", index=False)
    print("\n  ✓ Saved to nys_unified.csv")

    # ── Load to PostgreSQL
    CONNECTION_STRING = os.environ["DATABASE_URL"]
    load_to_postgres(df, CONNECTION_STRING)
