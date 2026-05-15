"""
NYS Simulator — Step 4: Correlation & Lag Analysis
Runs against your Neon PostgreSQL instance.

Install dependencies:
  pip install psycopg2-binary sqlalchemy pandas scipy statsmodels matplotlib seaborn

Run:
  python step4_analysis.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from scipy import stats
import warnings
warnings.filterwarnings("ignore")

# ── CONFIG ───────────────────────────────────────────────────────────────────

CONN = os.environ["DATABASE_URL"]

# Counties to exclude from per-county analysis (too small / too many nulls)
EXCLUDE_COUNTIES = ["Hamilton", "New York City"]

# Lag range to test (months)
LAG_RANGE = [0, 1, 2, 3, 6]

# COVID distortion window — we report results both with and without
COVID_YEARS = [2020, 2021]


# ── LOAD DATA ─────────────────────────────────────────────────────────────────

def load_data(conn_string: str) -> pd.DataFrame:
    print("Connecting to Neon...")
    engine = create_engine(conn_string)
    df = pd.read_sql("SELECT * FROM nys_unified ORDER BY county, month", engine)
    print(f"  ✓ Loaded {df.shape[0]:,} rows × {df.shape[1]} columns")
    return df


# ── HELPER: lagged correlation with p-value ───────────────────────────────────

def lagged_corr(df: pd.DataFrame, x_col: str, y_col: str, lag: int) -> dict:
    """
    Computes Pearson correlation between x_col at time T-lag and y_col at T.
    Groups by county first to avoid cross-county leakage.
    """
    rows = []
    for county, group in df.groupby("county"):
        g = group.sort_values("month")[[x_col, y_col]].dropna()
        if len(g) < 12:
            continue
        x = g[x_col].shift(lag)
        y = g[y_col]
        valid = x.notna() & y.notna()
        if valid.sum() < 10:
            continue
        r, p = stats.pearsonr(x[valid], y[valid])
        rows.append({"county": county, "r": r, "p": p, "n": valid.sum()})

    if not rows:
        return {"lag": lag, "median_r": np.nan, "mean_r": np.nan,
                "sig_pct": np.nan, "county_results": pd.DataFrame()}

    results = pd.DataFrame(rows)
    sig = results[results["p"] < 0.05]
    return {
        "lag": lag,
        "median_r": results["r"].median(),
        "mean_r": results["r"].mean(),
        "sig_pct": len(sig) / len(results) * 100,
        "county_results": results,
    }


# ── ANALYSIS 1: Statewide lag sweep ──────────────────────────────────────────

def analysis_lag_sweep(df: pd.DataFrame):
    print("\n" + "="*65)
    print("  ANALYSIS 1 — LAG SWEEP: Unemployment → Demand Outcomes")
    print("="*65)

    targets = {
        "medicaid_per_1k": "Medicaid Enrollment (per 1k)",
        "snap_per_1k":     "SNAP Enrollment (per 1k)",
    }

    # Run with and without COVID years
    for label, subset in [("Full dataset", df),
                           ("Excluding COVID (2020-2021)", df[~df["year"].isin(COVID_YEARS)])]:
        print(f"\n  [{label}]")
        print(f"  {'Outcome':<30} {'Lag 0':>8} {'Lag 1':>8} {'Lag 2':>8} {'Lag 3':>8} {'Lag 6':>8}")
        print(f"  {'-'*30} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*8}")

        clean = subset[~subset["county"].isin(EXCLUDE_COUNTIES)].copy()

        for col, label_col in targets.items():
            row_vals = []
            best_lag = None
            best_r = -999
            for lag in LAG_RANGE:
                result = lagged_corr(clean, "unemp_rate", col, lag)
                r = result["median_r"]
                row_vals.append(f"{r:>8.3f}" if not np.isnan(r) else "     n/a")
                if not np.isnan(r) and abs(r) > abs(best_r):
                    best_r = r
                    best_lag = lag
            print(f"  {label_col:<30} {'  '.join(row_vals)}   ← best lag: {best_lag}mo")


# ── ANALYSIS 2: Per-county correlation heatmap data ──────────────────────────

def analysis_per_county(df: pd.DataFrame):
    print("\n" + "="*65)
    print("  ANALYSIS 2 — PER-COUNTY: Unemployment → Medicaid (Lag 3)")
    print("="*65)

    clean = df[~df["county"].isin(EXCLUDE_COUNTIES)].copy()
    clean_nocovid = clean[~clean["year"].isin(COVID_YEARS)]

    result = lagged_corr(clean_nocovid, "unemp_rate", "medicaid_per_1k", lag=3)
    county_df = result["county_results"].sort_values("r", ascending=False)

    print(f"\n  Top 10 counties (strongest positive correlation):")
    print(f"  {'County':<20} {'r':>6}  {'p':>7}  {'n':>4}  {'Sig?':>5}")
    print(f"  {'-'*20} {'-'*6}  {'-'*7}  {'-'*4}  {'-'*5}")
    for _, row in county_df.head(10).iterrows():
        sig = "  ✓" if row["p"] < 0.05 else ""
        print(f"  {row['county']:<20} {row['r']:>6.3f}  {row['p']:>7.4f}  {row['n']:>4}{sig}")

    print(f"\n  Bottom 10 counties (weakest / inverse correlation):")
    print(f"  {'County':<20} {'r':>6}  {'p':>7}  {'n':>4}  {'Sig?':>5}")
    print(f"  {'-'*20} {'-'*6}  {'-'*7}  {'-'*4}  {'-'*5}")
    for _, row in county_df.tail(10).iterrows():
        sig = "  ✓" if row["p"] < 0.05 else ""
        print(f"  {row['county']:<20} {row['r']:>6.3f}  {row['p']:>7.4f}  {row['n']:>4}{sig}")

    return county_df


# ── ANALYSIS 3: Cross-metric correlations ─────────────────────────────────────

def analysis_cross_metric(df: pd.DataFrame):
    print("\n" + "="*65)
    print("  ANALYSIS 3 — CROSS-METRIC CORRELATIONS (Lag 1)")
    print("="*65)
    print("  Does Medicaid enrollment predict SNAP enrollment?")
    print("  Does unemployment predict crashes?")

    clean = df[~df["county"].isin(EXCLUDE_COUNTIES)].copy()
    clean_nocovid = clean[~clean["year"].isin(COVID_YEARS)]

    pairs = [
        ("medicaid_per_1k", "snap_per_1k",     "Medicaid → SNAP"),
        ("unemp_rate",      "snap_per_1k",      "Unemployment → SNAP"),
        ("unemp_rate",      "crashes_per_100k", "Unemployment → Crashes"),
        ("medicaid_per_1k", "crashes_per_100k", "Medicaid → Crashes"),
    ]

    print(f"\n  {'Relationship':<30} {'Lag 0':>8} {'Lag 1':>8} {'Lag 2':>8}")
    print(f"  {'-'*30} {'-'*8} {'-'*8} {'-'*8}")
    for x_col, y_col, label in pairs:
        vals = []
        for lag in [0, 1, 2]:
            r = lagged_corr(clean_nocovid, x_col, y_col, lag)["median_r"]
            vals.append(f"{r:>8.3f}" if not np.isnan(r) else "     n/a")
        print(f"  {label:<30} {'  '.join(vals)}")


# ── ANALYSIS 4: COVID shock analysis ─────────────────────────────────────────

def analysis_covid_shock(df: pd.DataFrame):
    print("\n" + "="*65)
    print("  ANALYSIS 4 — COVID SHOCK VALIDATION")
    print("  (Confirms model detects real economic shocks)")
    print("="*65)

    # Statewide monthly averages
    state = df[~df["county"].isin(["New York City"])].copy()
    monthly = state.groupby("month").agg(
        unemp_rate=("unemp_rate", "mean"),
        medicaid_per_1k=("medicaid_per_1k", "mean"),
        snap_per_1k=("snap_per_1k", "mean"),
    ).reset_index()
    monthly["year"] = monthly["month"].str[:4].astype(int)

    by_year = monthly.groupby("year")[["unemp_rate","medicaid_per_1k","snap_per_1k"]].mean()

    print(f"\n  {'Year':<6} {'Unemp %':>9} {'Medicaid/1k':>12} {'SNAP/1k':>9}")
    print(f"  {'-'*6} {'-'*9} {'-'*12} {'-'*9}")
    for year, row in by_year.iterrows():
        marker = "  ← COVID peak" if year == 2020 else \
                 "  ← enrollment surge" if year == 2021 else \
                 "  ← unwinding" if year == 2023 else ""
        print(f"  {year:<6} {row['unemp_rate']:>9.2f} {row['medicaid_per_1k']:>12.1f} {row['snap_per_1k']:>9.1f}{marker}")


# ── ANALYSIS 5: Regional breakdown ───────────────────────────────────────────

def analysis_regional(df: pd.DataFrame, county_corrs: pd.DataFrame):
    print("\n" + "="*65)
    print("  ANALYSIS 5 — REGIONAL PATTERNS")
    print("  (Urban vs suburban vs rural signal strength)")
    print("="*65)

    nyc_boroughs   = ["Bronx", "Kings", "New York", "Queens", "Richmond"]
    suburban       = ["Nassau", "Suffolk", "Westchester", "Rockland", "Putnam",
                      "Dutchess", "Orange", "Ulster"]
    upstate_urban  = ["Albany", "Erie", "Monroe", "Onondaga", "Saratoga"]

    def region_summary(counties, label):
        subset = county_corrs[county_corrs["county"].isin(counties)]
        if subset.empty:
            return
        print(f"\n  {label} ({len(subset)} counties):")
        print(f"    Median r: {subset['r'].median():.3f}")
        print(f"    Sig (p<0.05): {(subset['p']<0.05).sum()}/{len(subset)} counties")
        print(f"    Range: {subset['r'].min():.3f} to {subset['r'].max():.3f}")

    region_summary(nyc_boroughs,  "NYC Boroughs")
    region_summary(suburban,      "Suburban (Long Island + Hudson Valley)")
    region_summary(upstate_urban, "Upstate Urban Centers")

    # Everything else = rural
    known = nyc_boroughs + suburban + upstate_urban + list(EXCLUDE_COUNTIES)
    rural = county_corrs[~county_corrs["county"].isin(known)]
    if not rural.empty:
        print(f"\n  Rural Upstate ({len(rural)} counties):")
        print(f"    Median r: {rural['r'].median():.3f}")
        print(f"    Sig (p<0.05): {(rural['p']<0.05).sum()}/{len(rural)} counties")
        print(f"    Range: {rural['r'].min():.3f} to {rural['r'].max():.3f}")


# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    df = load_data(CONN)

    analysis_lag_sweep(df)
    county_corrs = analysis_per_county(df)
    analysis_cross_metric(df)
    analysis_covid_shock(df)
    analysis_regional(df, county_corrs)

    print("\n" + "="*65)
    print("  STEP 4 COMPLETE")
    print("  Key outputs for Step 5 (regression modeling):")
    print("  - Best lag for unemployment → Medicaid")
    print("  - Best lag for unemployment → SNAP")
    print("  - Which counties have strong vs weak signal")
    print("  - COVID years to exclude or flag in model")
    print("="*65)

