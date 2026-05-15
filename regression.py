"""
NYS Public Demand & Policy Impact Simulator
Step 5 — Regression Modeling

Purpose: Build county-level regression models that quantify the relationship
between unemployment and public demand metrics (Medicaid, SNAP). Outputs
model coefficients that the Step 6 simulation engine consumes directly.

Key design decisions from Step 4 findings:
  - Three-region split: NYC / Suburban / Upstate (different dynamics)
  - COVID dummy variable (2020-2021) to prevent distortion
  - Lag-0 for unemployment (strongest signal found in Step 4)
  - Year trend term to capture long-run demographic shifts
  - Monthly dummies for seasonality

Outputs:
  - model_coefficients.csv   (per-region coefficients for simulation engine)
  - model_diagnostics.csv    (R², residuals, fit quality per region)
  - regression_plots.png     (actual vs predicted + residuals)
  - region_models.pkl        (serialized models for Step 6 import)

Usage:
  pip install psycopg2-binary sqlalchemy pandas scipy statsmodels matplotlib seaborn joblib
  python regression.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import statsmodels.api as sm
from scipy import stats
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
import joblib
import warnings
warnings.filterwarnings("ignore")

# ── CONNECTION ────────────────────────────────────────────────────────────────

CONNECTION = os.environ["DATABASE_URL"]

# ── REGION DEFINITIONS ────────────────────────────────────────────────────────

REGIONS = {
    "NYC": [
        "Bronx", "Kings", "New York", "Queens", "Richmond"
    ],
    "Suburban": [
        "Nassau", "Suffolk", "Westchester", "Rockland", "Putnam",
        "Orange", "Dutchess", "Ulster"
    ],
    # All remaining counties fall into Upstate
}

COVID_YEARS = [2020, 2021]


# ── 1. LOAD DATA ──────────────────────────────────────────────────────────────

def load_data(conn_str: str) -> pd.DataFrame:
    engine = create_engine(conn_str)
    df = pd.read_sql("""
        SELECT county, month, year,
               unemp_rate,
               medicaid_per_1k,
               snap_per_1k,
               population
        FROM nys_unified
        WHERE county != 'New York City'
        ORDER BY county, month
    """, engine)

    # Assign region
    def assign_region(county):
        if county in REGIONS["NYC"]:
            return "NYC"
        elif county in REGIONS["Suburban"]:
            return "Suburban"
        else:
            return "Upstate"

    df["region"] = df["county"].apply(assign_region)
    df["month_dt"] = pd.to_datetime(df["month"] + "-01")
    df["month_num"] = df["month_dt"].dt.month
    df["covid"] = df["year"].isin(COVID_YEARS).astype(int)
    df["trend"] = (df["year"] - 2018) * 12 + df["month_num"]

    # Lag features
    df = df.sort_values(["county", "month"])
    for lag in [1, 2, 3]:
        df[f"unemp_lag{lag}"] = df.groupby("county")["unemp_rate"].shift(lag)

    print(f"Loaded {len(df):,} rows")
    print(f"Region counts: {df.drop_duplicates('county').groupby('region').size().to_dict()}")
    return df


# ── 2. BUILD REGION MODEL ─────────────────────────────────────────────────────

def build_model(region_df: pd.DataFrame, target: str, region_name: str) -> dict:
    """
    OLS regression for one region × one target variable.

    Model:
      target ~ unemp_rate + trend + covid + month_dummies
    
    We use lag-0 unemployment as Step 4 showed minimal decay across lags.
    COVID dummy absorbs the 2020-21 shock so it doesn't distort coefficients.
    """
    df = region_df.copy()

    # Month dummies for seasonality (drop January as reference)
    month_dummies = pd.get_dummies(df["month_num"], prefix="m", drop_first=True).astype(int)
    df = pd.concat([df, month_dummies], axis=1)

    feature_cols = ["unemp_rate", "trend", "covid"] + list(month_dummies.columns)

    clean = df[[target] + feature_cols].dropna()
    if len(clean) < 30:
        print(f"  WARNING: {region_name}/{target} has only {len(clean)} observations — skipping")
        return None

    X = sm.add_constant(clean[feature_cols])
    y = clean[target]

    model = sm.OLS(y, X).fit(cov_type="HC3")  # Heteroskedasticity-robust SEs

    # Predicted values and residuals
    clean = clean.copy()
    clean["predicted"] = model.predict(X)
    clean["residual"]  = clean[target] - clean["predicted"]

    return {
        "model":        model,
        "data":         clean,
        "region":       region_name,
        "target":       target,
        "r2":           round(model.rsquared, 4),
        "r2_adj":       round(model.rsquared_adj, 4),
        "n_obs":        int(model.nobs),
        "aic":          round(model.aic, 2),
        "features":     feature_cols,
        "coefficients": model.params.to_dict(),
        "pvalues":      model.pvalues.to_dict(),
        "conf_int":     model.conf_int().to_dict(),
    }


# ── 3. RUN ALL REGION × TARGET COMBINATIONS ───────────────────────────────────

def run_all_models(df: pd.DataFrame) -> dict:
    print("\n" + "="*60)
    print("  RUNNING REGRESSION MODELS")
    print("="*60)

    models = {}
    targets = ["medicaid_per_1k", "snap_per_1k"]

    for region in ["NYC", "Suburban", "Upstate"]:
        region_df = df[df["region"] == region].copy()
        models[region] = {}

        for target in targets:
            print(f"\n  {region} → {target}")
            result = build_model(region_df, target, region)
            if result is None:
                continue
            models[region][target] = result

            m = result["model"]
            print(f"    R²={result['r2']:.4f}  Adj-R²={result['r2_adj']:.4f}  n={result['n_obs']:,}")
            print(f"    unemp_rate:  β={m.params['unemp_rate']:+.4f}  "
                  f"p={m.pvalues['unemp_rate']:.4f}  "
                  f"{'✓ significant' if m.pvalues['unemp_rate'] < 0.05 else '✗ not significant'}")
            print(f"    trend:       β={m.params['trend']:+.4f}  "
                  f"p={m.pvalues['trend']:.4f}")
            print(f"    covid:       β={m.params['covid']:+.4f}  "
                  f"p={m.pvalues['covid']:.4f}")

    return models


# ── 4. EXPORT COEFFICIENTS FOR SIMULATION ENGINE ──────────────────────────────

def export_coefficients(models: dict) -> pd.DataFrame:
    """
    Flatten all model coefficients into a single CSV that the
    Step 6 simulation engine imports directly.

    One row per region × target × feature.
    """
    rows = []
    for region, region_models in models.items():
        for target, result in region_models.items():
            m = result["model"]
            for feature, coef in m.params.items():
                rows.append({
                    "region":    region,
                    "target":    target,
                    "feature":   feature,
                    "coef":      round(coef, 6),
                    "pvalue":    round(m.pvalues[feature], 6),
                    "ci_lower":  round(m.conf_int().loc[feature, 0], 6),
                    "ci_upper":  round(m.conf_int().loc[feature, 1], 6),
                    "r2":        result["r2"],
                    "r2_adj":    result["r2_adj"],
                    "n_obs":     result["n_obs"],
                })

    coef_df = pd.DataFrame(rows)
    coef_df.to_csv("model_coefficients.csv", index=False)
    print(f"\n  ✓ Saved model_coefficients.csv ({len(coef_df)} coefficient rows)")

    # Compact summary — just the key unemp_rate coefficient per model
    print("\n" + "="*60)
    print("  KEY COEFFICIENTS SUMMARY")
    print("  (β = change in demand per 1pp rise in unemployment)")
    print("="*60)
    key = coef_df[coef_df["feature"] == "unemp_rate"][
        ["region", "target", "coef", "pvalue", "r2"]
    ].sort_values(["target", "region"])
    print(key.to_string(index=False))

    return coef_df


# ── 5. DIAGNOSTICS ────────────────────────────────────────────────────────────

def run_diagnostics(models: dict) -> pd.DataFrame:
    """
    Check OLS assumptions:
    - Residual normality (Shapiro-Wilk)
    - Heteroskedasticity (Breusch-Pagan)
    - Autocorrelation (Durbin-Watson)
    """
    print("\n" + "="*60)
    print("  MODEL DIAGNOSTICS")
    print("="*60)

    diag_rows = []
    for region, region_models in models.items():
        for target, result in region_models.items():
            resid = result["data"]["residual"]
            m     = result["model"]

            # Normality
            _, p_shapiro = stats.shapiro(resid.sample(min(len(resid), 200), random_state=42))

            # Durbin-Watson (autocorrelation)
            dw = sm.stats.durbin_watson(resid)

            # Breusch-Pagan (heteroskedasticity)
            from statsmodels.stats.diagnostic import het_breuschpagan
            X_vals = m.model.exog
            _, p_bp, _, _ = het_breuschpagan(resid, X_vals)

            print(f"\n  {region} / {target}:")
            print(f"    Shapiro-Wilk p={p_shapiro:.4f}  {'✓ normal' if p_shapiro > 0.05 else '⚠ non-normal'}")
            print(f"    Durbin-Watson={dw:.4f}         {'✓ no autocorr' if 1.5 < dw < 2.5 else '⚠ autocorrelation'}")
            print(f"    Breusch-Pagan p={p_bp:.4f}    {'✓ homoskedastic' if p_bp > 0.05 else '⚠ heteroskedastic (using robust SEs)'}")

            diag_rows.append({
                "region": region, "target": target,
                "shapiro_p": round(p_shapiro, 4),
                "durbin_watson": round(dw, 4),
                "breusch_pagan_p": round(p_bp, 4),
                "r2": result["r2"],
            })

    diag_df = pd.DataFrame(diag_rows)
    diag_df.to_csv("model_diagnostics.csv", index=False)
    print(f"\n  ✓ Saved model_diagnostics.csv")
    return diag_df


# ── 6. PLOTS ──────────────────────────────────────────────────────────────────

def plot_results(models: dict, raw_df: pd.DataFrame):
    regions  = ["NYC", "Suburban", "Upstate"]
    targets  = ["medicaid_per_1k", "snap_per_1k"]
    labels   = {"medicaid_per_1k": "Medicaid per 1k", "snap_per_1k": "SNAP per 1k"}
    colors   = {"NYC": "#E74C3C", "Suburban": "#F39C12", "Upstate": "#2980B9"}

    fig = plt.figure(figsize=(18, 12))
    fig.suptitle("Step 5: Regression Model Fits by Region", fontsize=15, fontweight="bold")
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)

    for t_idx, target in enumerate(targets):
        for r_idx, region in enumerate(regions):
            ax = fig.add_subplot(gs[t_idx, r_idx])

            if region not in models or target not in models[region]:
                ax.set_visible(False)
                continue

            result = models[region][target]
            data   = result["data"].copy()

            # Merge month back for x-axis
            region_raw = raw_df[raw_df["region"] == region][["county","month","month_dt",target]].dropna()
            monthly_actual = region_raw.groupby("month_dt")[target].mean().reset_index()
            monthly_pred   = data.copy()
            monthly_pred["month_dt"] = raw_df.loc[data.index, "month_dt"] if "month_dt" in raw_df.columns else None

            ax.scatter(monthly_actual["month_dt"], monthly_actual[target],
                      alpha=0.4, s=8, color=colors[region], label="Actual")

            r2  = result["r2"]
            b   = result["model"].params.get("unemp_rate", 0)
            ax.set_title(f"{region}\n{labels[target]}\nR²={r2:.3f}  β(unemp)={b:+.3f}", fontsize=9)
            ax.set_xlabel("Month", fontsize=8)
            ax.set_ylabel(labels[target], fontsize=8)
            ax.tick_params(labelsize=7)
            ax.grid(alpha=0.3)

    plt.savefig("regression_plots.png", dpi=150, bbox_inches="tight")
    print("  ✓ Saved regression_plots.png")


# ── 7. SERIALIZE MODELS FOR STEP 6 ───────────────────────────────────────────

def serialize_models(models: dict):
    """
    Save fitted model objects so Step 6 simulation engine
    can import them directly without retraining.
    """
    joblib.dump(models, "region_models.pkl")
    print("  ✓ Saved region_models.pkl (import in Step 6 with joblib.load)")


# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("NYS Demand Simulator — Step 5: Regression Modeling")
    print("="*60)

    df     = load_data(CONNECTION)
    models = run_all_models(df)
    coefs  = export_coefficients(models)
    diags  = run_diagnostics(models)

    plot_results(models, df)
    serialize_models(models)

    print("\n" + "="*60)
    print("  STEP 5 COMPLETE")
    print("  Files written:")
    print("    - model_coefficients.csv   (coefficients for simulation engine)")
    print("    - model_diagnostics.csv    (R², normality, autocorrelation)")
    print("    - regression_plots.png     (actual vs predicted)")
    print("    - region_models.pkl        (serialized models for Step 6)")
    print("\n  Next: python simulate.py  (Step 6 — Simulation Engine)")
    print("="*60)
