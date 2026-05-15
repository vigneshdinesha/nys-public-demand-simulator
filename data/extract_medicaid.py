"""
Extract Medicaid enrollment data from NYS DOH PDFs.
Reads all PDFs from data/raw/medicaid/{year}/{month}.pdf
Outputs combined CSV to data/processed/medicaid_enrollment.csv
"""

import re
import os
import pandas as pd
import tabula

RAW_DIR = "data/raw/medicaid"
OUT_DIR = "data/processed"
OUT_FILE = os.path.join(OUT_DIR, "medicaid_enrollment.csv")

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}

# County names that start with digits or have tricky boundaries
# We split on the boundary between letters/closing-paren and a digit
COUNTY_ENROLLMENT_RE = re.compile(r'^(.+?)\s*\r?\s*([\d,]+)$')


def parse_county_table(df):
    """Parse a single-column table of 'COUNTY\\r123,456' strings."""
    rows = []
    for val in df.iloc[:, 0].dropna().astype(str):
        val = val.strip()
        m = COUNTY_ENROLLMENT_RE.match(val)
        if m:
            county = m.group(1).strip()
            enrollment = int(m.group(2).replace(",", ""))
            rows.append((county, enrollment))
        else:
            print(f"  WARNING: Could not parse: {val!r}")
    return rows


def extract_pdf(pdf_path, year, month_abbr):
    """Extract county enrollment data from a single PDF."""
    month_num = MONTH_MAP[month_abbr]
    month_str = f"{year}-{month_num}"

    dfs = tabula.read_pdf(pdf_path, pages="all", multiple_tables=True)

    if len(dfs) < 3:
        print(f"  WARNING: Expected 3 tables in {pdf_path}, got {len(dfs)}")
        return pd.DataFrame()

    # Tables 1 and 2 are the two side-by-side county columns
    rows = parse_county_table(dfs[1]) + parse_county_table(dfs[2])

    df = pd.DataFrame(rows, columns=["county", "enrollment"])
    df["month"] = month_str

    # Standardize county names
    df["county"] = df["county"].str.title()
    # Normalize parenthetical names
    replacements = {
        "Kings (Brooklyn)": "Kings",
        "New York (Manhattan)": "New York",
        "Richmond (Staten Island)": "Richmond",
        "Saint Lawrence": "St. Lawrence",
    }
    df["county"] = df["county"].replace(replacements)

    return df


EXPECTED_COUNTIES = 62
SPIKE_THRESHOLD = 0.25  # flag month-over-month changes > 25%
VALIDATION_LOG = os.path.join(OUT_DIR, "medicaid_validation.log")


def validate(df):
    """Run data quality checks and write a validation report."""
    issues = []

    # 1. Missing values
    nulls = df.isnull().sum()
    if nulls.any():
        issues.append(f"MISSING VALUES:\n{nulls[nulls > 0].to_string()}")

    # 2. Duplicates
    dupes = df.duplicated(subset=["county", "month"], keep=False)
    if dupes.any():
        dup_rows = df[dupes].sort_values(["month", "county"])
        issues.append(f"DUPLICATES ({dupes.sum()} rows):\n{dup_rows.to_string()}")

    # 3. County count per month (should be 62)
    counts = df.groupby("month")["county"].nunique()
    bad_months = counts[counts != EXPECTED_COUNTIES]
    if len(bad_months):
        issues.append(
            f"WRONG COUNTY COUNT (expected {EXPECTED_COUNTIES}):\n"
            + bad_months.to_string()
        )

    # 4. Month-over-month spikes per county
    df_sorted = df.sort_values(["county", "month"])
    df_sorted["prev"] = df_sorted.groupby("county")["enrollment"].shift(1)
    df_sorted["pct_change"] = (
        (df_sorted["enrollment"] - df_sorted["prev"]) / df_sorted["prev"]
    )
    spikes = df_sorted[df_sorted["pct_change"].abs() > SPIKE_THRESHOLD].copy()
    if len(spikes):
        spikes["pct_change_fmt"] = (spikes["pct_change"] * 100).round(1).astype(str) + "%"
        spike_report = spikes[["county", "month", "prev", "enrollment", "pct_change_fmt"]]
        spike_report.columns = ["county", "month", "previous", "current", "change"]
        issues.append(
            f"ENROLLMENT SPIKES (>{SPIKE_THRESHOLD*100:.0f}% month-over-month):\n"
            + spike_report.to_string(index=False)
        )

    # 5. Summary stats per county
    stats = (
        df.groupby("county")["enrollment"]
        .agg(["min", "max", "mean", "std"])
        .round(0)
        .astype(int)
    )

    # --- Print report ---
    print(f"\n{'='*50}")
    print("DATA VALIDATION REPORT")
    print(f"{'='*50}")

    if not issues:
        print("  All checks passed (no nulls, no dupes, 62 counties/month)")
    else:
        for issue in issues:
            print(f"\n{issue}")

    print(f"\nPER-COUNTY SUMMARY STATS:")
    print(stats.to_string())

    # --- Write log file ---
    with open(VALIDATION_LOG, "w") as f:
        f.write("MEDICAID ENROLLMENT — DATA VALIDATION REPORT\n")
        f.write(f"Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"Rows: {len(df)}  |  Counties: {df['county'].nunique()}  |  ")
        f.write(f"Months: {df['month'].nunique()}\n")
        f.write(f"Date range: {df['month'].min()} to {df['month'].max()}\n")
        f.write(f"{'='*60}\n\n")
        if not issues:
            f.write("All checks passed.\n")
        else:
            for issue in issues:
                f.write(f"{issue}\n\n")
        f.write(f"\nPER-COUNTY SUMMARY STATS:\n{stats.to_string()}\n")

    print(f"\nValidation log saved to: {VALIDATION_LOG}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    all_dfs = []
    errors = []

    years = sorted(os.listdir(RAW_DIR))
    for year in years:
        year_dir = os.path.join(RAW_DIR, year)
        if not os.path.isdir(year_dir):
            continue

        pdfs = sorted(
            [f for f in os.listdir(year_dir) if f.endswith(".pdf")],
            key=lambda f: MONTH_MAP.get(f.replace(".pdf", ""), "99"),
        )

        for pdf_file in pdfs:
            month_abbr = pdf_file.replace(".pdf", "")
            pdf_path = os.path.join(year_dir, pdf_file)
            print(f"Processing {year}/{pdf_file}...", end=" ")

            try:
                df = extract_pdf(pdf_path, year, month_abbr)
                n_counties = len(df[df["county"] != "Other"])
                print(f"{len(df)} rows ({n_counties} counties)")
                all_dfs.append(df)
            except Exception as e:
                print(f"ERROR: {e}")
                errors.append((pdf_path, str(e)))

    if all_dfs:
        combined = pd.concat(all_dfs, ignore_index=True)

        # Drop "Other" — not a real county, distorts modeling
        combined = combined[combined["county"] != "Other"]

        # Reorder columns
        combined = combined[["county", "month", "enrollment"]]
        combined = combined.sort_values(["month", "county"]).reset_index(drop=True)
        combined.to_csv(OUT_FILE, index=False)

        print(f"\n{'='*50}")
        print(f"Total rows: {len(combined)}")
        print(f"Date range: {combined['month'].min()} to {combined['month'].max()}")
        print(f"Counties:   {combined['county'].nunique()}")
        print(f"Saved to:   {OUT_FILE}")

        # --- DATA VALIDATION ---
        validate(combined)

    if errors:
        print(f"\n{len(errors)} ERRORS:")
        for path, err in errors:
            print(f"  {path}: {err}")


if __name__ == "__main__":
    main()
