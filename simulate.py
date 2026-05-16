"""
NYS Public Demand & Policy Impact Simulator
Step 6 — Simulation Engine

Purpose: Takes a user-defined scenario (county + unemployment shock) and
produces predicted changes in Medicaid and SNAP demand, with confidence
intervals and honest uncertainty flagging based on model fit quality.

Design decisions from Step 5 findings:
  - NYC:              unemployment → Medicaid signal is strong (R²=0.22, p<0.001)
  - Suburban/Upstate: unemployment → Medicaid NOT significant; flag low confidence
  - Suburban/Upstate: unemployment → SNAP significant; use with noted low R²
  - Autocorrelation:  show baseline trajectory alongside shock effect
  - All predictions:  expressed as per-capita rates AND absolute headcount

Usage (standalone):
  python simulate.py

Usage (import in FastAPI Step 7):
  from simulate import SimulationEngine
  engine = SimulationEngine("model_coefficients.csv", "nys_unified")
  result = engine.run(county="Erie", unemp_shock=2.0)
"""

import os
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import warnings
warnings.filterwarnings("ignore")

# ── CONNECTION & PATHS ────────────────────────────────────────────────────────

CONNECTION      = os.environ["DATABASE_URL"]
COEFFICIENTS_PATH = "model_coefficients.csv"

# ── REGION MAP ────────────────────────────────────────────────────────────────

REGION_MAP = {
    "Bronx":       "NYC",      "Kings":       "NYC",
    "New York":    "NYC",      "Queens":      "NYC",
    "Richmond":    "NYC",
    "Nassau":      "Suburban", "Suffolk":     "Suburban",
    "Westchester": "Suburban", "Rockland":    "Suburban",
    "Putnam":      "Suburban", "Orange":      "Suburban",
    "Dutchess":    "Suburban", "Ulster":      "Suburban",
}

# Confidence thresholds based on Step 5 findings
CONFIDENCE_RULES = {
    ("NYC",      "medicaid_per_1k"): "high",
    ("Suburban", "medicaid_per_1k"): "low",      # p=0.57, not significant
    ("Suburban", "snap_per_1k"):     "moderate",  # p=0.04, significant but R²=0.01
    ("Upstate",  "medicaid_per_1k"): "low",       # p=0.43, not significant
    ("Upstate",  "snap_per_1k"):     "moderate",  # p<0.001, significant but R²=0.03
}

CONFIDENCE_LABELS = {
    "high":     "High confidence — strong historical signal (R²=0.22, p<0.001)",
    "moderate": "Moderate confidence — statistically significant but explains limited variance",
    "low":      "Low confidence — unemployment is not a significant predictor in this region. "
                "Medicaid here is driven more by demographics than labor market changes.",
}

# ── COST CONSTANTS ───────────────────────────────────────────────────────────
# Medicaid: NYS DOH blended per-enrollee monthly cost
# Recession-driven enrollment skews younger/healthier, so actual cost is lower.
# We use the blended average and flag the caveat.
MEDICAID_MONTHLY_COST_PER_ENROLLEE = 850  # statewide blended average

# SNAP: calculated from actual data — snap_benefits / snap_persons per county
# Falls back to statewide average if county data missing
SNAP_MONTHLY_COST_FALLBACK = 193  # statewide average from data

# Caseworker ratios (OTDA staffing guidelines)
SNAP_CASES_PER_WORKER = 175  # 1 caseworker per ~150-200 cases, midpoint
MEDICAID_CASES_PER_WORKER = 300  # Medicaid eligibility workers handle larger caseloads


# ── SIMULATION ENGINE ─────────────────────────────────────────────────────────

class SimulationEngine:

    def __init__(self, coef_path: str, db_connection: str):
        self.coefs = pd.read_csv(coef_path)
        self.engine = create_engine(db_connection, pool_pre_ping=True, pool_recycle=300)
        self._baseline_cache = {}

    def _get_region(self, county: str) -> str:
        return REGION_MAP.get(county, "Upstate")

    def _get_coefficient(self, region: str, target: str, feature: str) -> dict:
        row = self.coefs[
            (self.coefs["region"]   == region) &
            (self.coefs["target"]   == target) &
            (self.coefs["feature"]  == feature)
        ]
        if row.empty:
            return None
        r = row.iloc[0]
        return {
            "coef":     r["coef"],
            "ci_lower": r["ci_lower"],
            "ci_upper": r["ci_upper"],
            "pvalue":   r["pvalue"],
            "r2":       r["r2"],
        }

    def _get_baseline(self, county: str) -> pd.DataFrame:
        """Fetch the most recent 24 months of actuals for the county."""
        if county in self._baseline_cache:
            return self._baseline_cache[county]

        df = pd.read_sql(f"""
            SELECT month, year, unemp_rate,
                   medicaid_per_1k, medicaid_enrollment,
                   snap_per_1k, snap_persons, snap_benefits,
                   population
            FROM nys_unified
            WHERE county = '{county}'
            ORDER BY month DESC
            LIMIT 24
        """, self.engine)

        df = df.sort_values("month").reset_index(drop=True)
        self._baseline_cache[county] = df
        return df

    def _get_snap_cost_per_person(self, baseline: pd.DataFrame) -> float:
        """Calculate actual SNAP benefit per person from county data."""
        recent = baseline.tail(12)
        valid = recent[(recent["snap_persons"] > 0) & (recent["snap_benefits"] > 0)]
        if len(valid) >= 3:
            return (valid["snap_benefits"] / valid["snap_persons"]).mean()
        return SNAP_MONTHLY_COST_FALLBACK

    def _project_baseline(self, baseline: pd.DataFrame, horizon_months: int) -> pd.DataFrame:
        """
        Project the baseline trajectory forward using the trend from
        the last 12 months — captures pre-existing momentum independently
        of the unemployment shock.
        """
        recent = baseline.tail(12)

        # Simple linear trend per metric
        x = np.arange(len(recent))
        projections = {}

        for col in ["medicaid_per_1k", "snap_per_1k", "unemp_rate"]:
            valid = recent[col].dropna()
            if len(valid) >= 6:
                slope, intercept, *_ = np.polyfit(x[-len(valid):], valid.values, 1), None
                trend_slope = slope[0] if hasattr(slope, '__len__') else slope
                last_val = valid.iloc[-1]
                projections[col] = [
                    last_val + trend_slope * (i + 1)
                    for i in range(horizon_months)
                ]
            else:
                last_val = recent[col].dropna().iloc[-1] if not recent[col].dropna().empty else 0
                projections[col] = [last_val] * horizon_months

        pop = baseline["population"].dropna().iloc[-1] if not baseline["population"].dropna().empty else 1

        proj_df = pd.DataFrame(projections)
        proj_df["month_offset"] = range(1, horizon_months + 1)
        proj_df["population"]   = pop
        return proj_df

    def run(self, county: str, unemp_shock: float, horizon_months: int = 6) -> dict:
        """
        Run a simulation scenario.

        Parameters:
          county         : NYS county name (e.g. "Erie", "Bronx", "Albany")
          unemp_shock    : Change in unemployment rate in percentage points
                           e.g. +2.0 means unemployment rises by 2pp
          horizon_months : How many months forward to project (default 6)

        Returns:
          dict with full simulation results, ready for API response or print
        """
        region   = self._get_region(county)
        baseline = self._get_baseline(county)
        baseline_proj = self._project_baseline(baseline, horizon_months)

        # Current snapshot (most recent month)
        current = baseline.iloc[-1]
        current_month      = current["month"]
        current_unemp      = current["unemp_rate"]
        current_medicaid   = current["medicaid_per_1k"]
        current_snap       = current["snap_per_1k"]
        population         = current["population"] or 1

        shocked_unemp = current_unemp + unemp_shock

        results = {
            "county":           county,
            "region":           region,
            "as_of_month":      current_month,
            "unemp_shock_pp":   unemp_shock,
            "current_unemp":    round(current_unemp, 2),
            "shocked_unemp":    round(shocked_unemp, 2),
            "population":       int(population),
            "predictions":      {},
            "baseline_trend":   {},
            "warnings":         [],
        }

        # ── Medicaid prediction ──────────────────────────────────────────────
        med_coef = self._get_coefficient(region, "medicaid_per_1k", "unemp_rate")
        if med_coef:
            confidence = CONFIDENCE_RULES.get((region, "medicaid_per_1k"), "low")

            delta_per_1k      = med_coef["coef"]      * unemp_shock
            delta_per_1k_low  = med_coef["ci_lower"]  * unemp_shock
            delta_per_1k_high = med_coef["ci_upper"]  * unemp_shock

            # Ensure CI bounds are ordered correctly when shock is negative
            if unemp_shock < 0:
                delta_per_1k_low, delta_per_1k_high = delta_per_1k_high, delta_per_1k_low

            # Absolute headcount impact
            delta_headcount      = delta_per_1k      / 1000 * population
            delta_headcount_low  = delta_per_1k_low  / 1000 * population
            delta_headcount_high = delta_per_1k_high / 1000 * population

            # Cost impact
            annual_cost          = delta_headcount      * MEDICAID_MONTHLY_COST_PER_ENROLLEE * 12
            annual_cost_low      = delta_headcount_low  * MEDICAID_MONTHLY_COST_PER_ENROLLEE * 12
            annual_cost_high     = delta_headcount_high * MEDICAID_MONTHLY_COST_PER_ENROLLEE * 12
            if unemp_shock < 0:
                annual_cost_low, annual_cost_high = annual_cost_high, annual_cost_low
            caseworkers_needed   = abs(delta_headcount) / MEDICAID_CASES_PER_WORKER

            # Current baseline cost for percentage context
            current_enrollment   = (current_medicaid / 1000) * population
            current_annual_cost  = current_enrollment * MEDICAID_MONTHLY_COST_PER_ENROLLEE * 12

            results["predictions"]["medicaid"] = {
                "target":               "medicaid_per_1k",
                "current_per_1k":       round(current_medicaid, 2),
                "predicted_per_1k":     round(current_medicaid + delta_per_1k, 2),
                "delta_per_1k":         round(delta_per_1k, 2),
                "delta_per_1k_ci":      [round(delta_per_1k_low, 2), round(delta_per_1k_high, 2)],
                "delta_headcount":      round(delta_headcount),
                "delta_headcount_ci":   [round(delta_headcount_low), round(delta_headcount_high)],
                "pct_change":           round(delta_per_1k / current_medicaid * 100, 2) if current_medicaid else None,
                "confidence":           confidence,
                "confidence_note":      CONFIDENCE_LABELS[confidence],
                "model_r2":             med_coef["r2"],
                "model_pvalue":         med_coef["pvalue"],
                "cost_impact": {
                    "annual_cost":          round(annual_cost),
                    "annual_cost_ci":       [round(annual_cost_low), round(annual_cost_high)],
                    "monthly_cost":         round(annual_cost / 12),
                    "cost_per_enrollee_mo": MEDICAID_MONTHLY_COST_PER_ENROLLEE,
                    "caseworkers_needed":   round(caseworkers_needed, 1),
                    "pct_of_current_cost":  round(annual_cost / current_annual_cost * 100, 2) if current_annual_cost else None,
                    "caveat": "Uses blended per-enrollee cost ($850/mo). Recession-driven enrollment skews younger and healthier, so actual cost per new enrollee is likely lower.",
                },
            }

            if confidence == "low":
                results["warnings"].append(
                    f"Medicaid prediction for {region} counties has low confidence. "
                    f"Unemployment is not a statistically significant predictor (p={med_coef['pvalue']:.3f})."
                )

        # ── SNAP prediction ──────────────────────────────────────────────────
        snap_coef = self._get_coefficient(region, "snap_per_1k", "unemp_rate")
        if snap_coef:
            confidence = CONFIDENCE_RULES.get((region, "snap_per_1k"), "low")

            delta_per_1k      = snap_coef["coef"]     * unemp_shock
            delta_per_1k_low  = snap_coef["ci_lower"] * unemp_shock
            delta_per_1k_high = snap_coef["ci_upper"] * unemp_shock

            if unemp_shock < 0:
                delta_per_1k_low, delta_per_1k_high = delta_per_1k_high, delta_per_1k_low

            delta_headcount      = delta_per_1k      / 1000 * population
            delta_headcount_low  = delta_per_1k_low  / 1000 * population
            delta_headcount_high = delta_per_1k_high / 1000 * population

            # Cost impact — use actual county-level benefit-per-person
            snap_cost_pp         = self._get_snap_cost_per_person(baseline)
            annual_cost          = delta_headcount      * snap_cost_pp * 12
            annual_cost_low      = delta_headcount_low  * snap_cost_pp * 12
            annual_cost_high     = delta_headcount_high * snap_cost_pp * 12
            if unemp_shock < 0:
                annual_cost_low, annual_cost_high = annual_cost_high, annual_cost_low
            caseworkers_needed   = abs(delta_headcount) / SNAP_CASES_PER_WORKER

            # Current baseline cost
            current_snap_persons = (current_snap / 1000) * population if current_snap else 0
            current_annual_cost  = current_snap_persons * snap_cost_pp * 12

            results["predictions"]["snap"] = {
                "target":               "snap_per_1k",
                "current_per_1k":       round(current_snap, 2) if current_snap else None,
                "predicted_per_1k":     round(current_snap + delta_per_1k, 2) if current_snap else None,
                "delta_per_1k":         round(delta_per_1k, 2),
                "delta_per_1k_ci":      [round(delta_per_1k_low, 2), round(delta_per_1k_high, 2)],
                "delta_headcount":      round(delta_headcount),
                "delta_headcount_ci":   [round(delta_headcount_low), round(delta_headcount_high)],
                "pct_change":           round(delta_per_1k / current_snap * 100, 2) if current_snap else None,
                "confidence":           confidence,
                "confidence_note":      CONFIDENCE_LABELS[confidence],
                "model_r2":             snap_coef["r2"],
                "model_pvalue":         snap_coef["pvalue"],
                "cost_impact": {
                    "annual_cost":          round(annual_cost),
                    "annual_cost_ci":       [round(annual_cost_low), round(annual_cost_high)],
                    "monthly_cost":         round(annual_cost / 12),
                    "cost_per_person_mo":   round(snap_cost_pp, 2),
                    "caseworkers_needed":   round(caseworkers_needed, 1),
                    "pct_of_current_cost":  round(annual_cost / current_annual_cost * 100, 2) if current_annual_cost else None,
                    "caveat": f"Based on {county}'s actual average SNAP benefit of ${snap_cost_pp:.0f}/person/month from recent data.",
                },
            }
        elif region == "NYC":
            results["warnings"].append(
                "SNAP data for NYC is reported at the city-district level, not by borough. "
                "Per-borough SNAP predictions are not available."
            )

        # ── Baseline trend ───────────────────────────────────────────────────
        results["baseline_trend"] = {
            "medicaid_per_1k": [round(v, 2) for v in baseline_proj["medicaid_per_1k"].tolist()],
            "snap_per_1k":     [round(v, 2) for v in baseline_proj["snap_per_1k"].tolist()],
            "unemp_rate":      [round(v, 2) for v in baseline_proj["unemp_rate"].tolist()],
            "horizon_months":  horizon_months,
            "note": "Baseline trajectory projects pre-existing trend independent of unemployment shock.",
        }

        return results

    def print_report(self, result: dict):
        """Pretty-print a simulation result to console."""
        r = result
        print("\n" + "="*65)
        print(f"  SIMULATION REPORT")
        print(f"  County: {r['county']} ({r['region']} region)")
        print(f"  As of:  {r['as_of_month']}")
        print("="*65)
        print(f"\n  SCENARIO")
        print(f"    Current unemployment:  {r['current_unemp']}%")
        print(f"    Shock applied:        {r['unemp_shock_pp']:+.1f} percentage points")
        print(f"    Shocked unemployment:  {r['shocked_unemp']}%")
        print(f"    County population:     {r['population']:,}")

        for metric, pred in r["predictions"].items():
            label = "Medicaid" if metric == "medicaid" else "SNAP"
            print(f"\n  {label.upper()} IMPACT")
            print(f"    Current enrollees per 1k: {pred['current_per_1k']}")
            print(f"    Predicted per 1k:         {pred['predicted_per_1k']}")
            print(f"    Change per 1k:            {pred['delta_per_1k']:+.2f}  "
                  f"(95% CI: {pred['delta_per_1k_ci'][0]:+.2f} to {pred['delta_per_1k_ci'][1]:+.2f})")
            print(f"    Headcount impact:         {pred['delta_headcount']:+,.0f} people  "
                  f"(CI: {pred['delta_headcount_ci'][0]:+,.0f} to {pred['delta_headcount_ci'][1]:+,.0f})")
            if pred["pct_change"]:
                print(f"    Percent change:           {pred['pct_change']:+.2f}%")
            print(f"    Confidence:               {pred['confidence'].upper()}")
            print(f"    Note: {pred['confidence_note']}")

            # Cost impact
            if "cost_impact" in pred:
                c = pred["cost_impact"]
                print(f"\n    BUDGET IMPACT")
                print(f"      Annual cost change:     ${c['annual_cost']:+,.0f}")
                print(f"      Monthly cost change:    ${c['monthly_cost']:+,.0f}")
                print(f"      Caseworkers needed:     ~{c['caseworkers_needed']:.0f}")
                if c.get("pct_of_current_cost"):
                    print(f"      % of current budget:    {c['pct_of_current_cost']:+.1f}%")
                print(f"      Note: {c['caveat']}")

        if r["warnings"]:
            print(f"\n  ⚠  WARNINGS")
            for w in r["warnings"]:
                print(f"    - {w}")

        print(f"\n  BASELINE TREND (next {r['baseline_trend']['horizon_months']} months, no shock)")
        print(f"    Medicaid per 1k: {r['baseline_trend']['medicaid_per_1k']}")
        print(f"    SNAP per 1k:     {r['baseline_trend']['snap_per_1k']}")
        print("="*65)


# ── EXAMPLE SCENARIOS ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("NYS Demand Simulator — Step 6: Simulation Engine")
    print("="*65)

    engine = SimulationEngine(COEFFICIENTS_PATH, CONNECTION)

    scenarios = [
        ("Bronx",    +3.0, "NYC borough — recession shock"),
        ("Erie",     +2.0, "Upstate manufacturing county"),
        ("Suffolk",  +1.5, "Suburban commuter county"),
        ("Albany",   -1.0, "Upstate — unemployment improvement"),
    ]

    for county, shock, description in scenarios:
        print(f"\n>>> Scenario: {description}")
        result = engine.run(county=county, unemp_shock=shock, horizon_months=6)
        engine.print_report(result)
