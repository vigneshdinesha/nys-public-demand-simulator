"""
Clean Census county population estimates for NYS.
- 2010s file (co-est2019-alldata.csv): extract 2018-2019
- 2020s file (co-est2025-alldata.csv): extract 2020-2025
- Melt wide-to-long, standardize county names
- Output: data/processed/population.csv
"""

import pandas as pd

RAW_2010s = "data/raw/census/co-est2019-alldata.csv"
RAW_2020s = "data/raw/census/co-est2025-alldata.csv"
OUT_FILE = "data/processed/population.csv"

# Census "County" names that need mapping to match Medicaid/unemployment data
COUNTY_NAME_MAP = {
    "New York County": "New York",
    "Kings County": "Kings",
    "Richmond County": "Richmond",
    "St. Lawrence County": "St. Lawrence",
}


def load_ny_counties(path, years):
    """Load a Census alldata file, filter to NY counties, extract specific years."""
    df = pd.read_csv(path, encoding="latin-1")
    df = df[(df["STNAME"] == "New York") & (df["SUMLEV"] == 50)].copy()

    pop_cols = [f"POPESTIMATE{y}" for y in years]
    df = df[["CTYNAME"] + pop_cols]

    # Melt wide to long
    df = df.melt(id_vars="CTYNAME", var_name="year", value_name="population")
    df["year"] = df["year"].str.replace("POPESTIMATE", "").astype(int)

    return df


def main():
    # 2018-2019 from the 2010s file
    df_old = load_ny_counties(RAW_2010s, [2018, 2019])

    # 2020-2025 from the 2020s file
    df_new = load_ny_counties(RAW_2020s, range(2020, 2026))

    # Stack
    df = pd.concat([df_old, df_new], ignore_index=True)

    # Standardize county names: strip " County", apply overrides
    df["county"] = df["CTYNAME"].str.replace(" County$", "", regex=True)
    df["county"] = df["county"].replace(COUNTY_NAME_MAP)
    df = df.drop(columns=["CTYNAME"])

    # Reorder and sort
    df = df[["county", "year", "population"]].sort_values(["year", "county"]).reset_index(drop=True)

    # --- Validation ---
    print(f"Rows:     {len(df)}")
    print(f"Counties: {df['county'].nunique()}")
    print(f"Years:    {sorted(df['year'].unique())}")
    print(f"Nulls:    {df.isnull().sum().sum()}")

    counties_per_year = df.groupby("year")["county"].nunique()
    bad = counties_per_year[counties_per_year != 62]
    if len(bad):
        print(f"\nYears with != 62 counties:\n{bad}")
    else:
        print("Check:    62 counties per year — ALL PASS")

    # Cross-check county names against Medicaid
    med = pd.read_csv("data/processed/medicaid_enrollment.csv")
    pop_counties = set(df["county"].unique())
    med_counties = set(med["county"].unique())
    diff1 = pop_counties - med_counties
    diff2 = med_counties - pop_counties
    if diff1 or diff2:
        print(f"\nMISMATCH vs Medicaid:")
        if diff1: print(f"  In population only: {diff1}")
        if diff2: print(f"  In medicaid only:   {diff2}")
    else:
        print("Check:    County names match Medicaid data — ALL PASS")

    df.to_csv(OUT_FILE, index=False)
    print(f"\nSaved to: {OUT_FILE}")


if __name__ == "__main__":
    main()
