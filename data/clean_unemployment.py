"""
Clean NYS Local Area Unemployment Statistics CSV.
- Filter to 62 county-level rows only
- Strip trailing whitespace from column names
- Convert comma-formatted strings to numeric
- Standardize county names to match Medicaid data
- Output: data/processed/unemployment.csv
"""

import pandas as pd

RAW_FILE = "Local_Area_Unemployment_Statistics__Beginning_1976_20260401.csv"
OUT_FILE = "data/processed/unemployment.csv"

# Map unemployment "Area" names to standardized county names (matching Medicaid)
COUNTY_NAME_MAP = {
    "New York County": "New York",
    "Kings County": "Kings",
    "Richmond County": "Richmond",
    "St. Lawrence County": "St. Lawrence",
}


def main():
    df = pd.read_csv(RAW_FILE)

    # Fix column names — strip whitespace
    df.columns = df.columns.str.strip()

    # Filter to county-level rows only
    df = df[df["Area"].str.endswith("County")].copy()

    # Strip " County" suffix and standardize names
    df["county"] = df["Area"].str.replace(" County$", "", regex=True)
    df["county"] = df["county"].replace(COUNTY_NAME_MAP)

    # Build month column as YYYY-MM
    df["month"] = df["Year"].astype(str) + "-" + df["Month"].astype(str).str.zfill(2)

    # Convert comma-formatted strings to numeric
    for col in ["Labor Force", "Employed", "Unemployed"]:
        df[col] = df[col].str.replace(",", "").astype(int)

    # Convert unemployment rate (strip % sign)
    df["Unemployment Rate"] = df["Unemployment Rate"].str.replace("%", "").astype(float)

    # Rename to clean snake_case
    df = df.rename(columns={
        "Labor Force": "labor_force",
        "Employed": "employed",
        "Unemployed": "unemployed",
        "Unemployment Rate": "unemployment_rate",
    })

    # Select and sort final columns
    df = df[["county", "month", "labor_force", "employed", "unemployed", "unemployment_rate"]]
    df = df.sort_values(["month", "county"]).reset_index(drop=True)

    # --- Validation ---
    print(f"Rows:     {len(df)}")
    print(f"Counties: {df['county'].nunique()}")
    print(f"Range:    {df['month'].min()} to {df['month'].max()}")
    print(f"Nulls:    {df.isnull().sum().sum()}")

    counties_per_month = df.groupby("month")["county"].nunique()
    bad = counties_per_month[counties_per_month != 62]
    if len(bad):
        print(f"\nMonths with != 62 counties:\n{bad}")
    else:
        print("Check:    62 counties per month — ALL PASS")

    df.to_csv(OUT_FILE, index=False)
    print(f"\nSaved to: {OUT_FILE}")


if __name__ == "__main__":
    main()
