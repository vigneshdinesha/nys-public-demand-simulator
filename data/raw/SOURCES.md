# Raw data sources

The raw CSV/PDF inputs (~343 MB total) are excluded from this repository because they are publicly redistributable from their original sources. Download them into this directory before running `etl.py`.

| File / dataset | Source portal | Notes |
|---|---|---|
| `Local_Area_Unemployment_Statistics__Beginning_1976_*.csv` | <https://data.ny.gov/> → search **"Local Area Unemployment Statistics"** | NYS Dept. of Labor LAUS series. Monthly, county-level. |
| `medicaid/*.pdf` + `medicaid_enrollment.csv` | <https://www.health.ny.gov/health_care/medicaid/> — *Medicaid Enrollment by County* monthly reports | Published only as per-month PDFs. The ingestion pipeline in [`data/extract_medicaid.py`](../extract_medicaid.py) parses each PDF and emits a clean per-county time series. |
| `Supplemental_Nutrition_Assistance_Program_(SNAP)_Caseloads_and_Expenditures*.csv` | <https://data.ny.gov/> → search **"SNAP Caseloads and Expenditures"** | NYS OTDA monthly caseload data. |
| `Motor_Vehicle_Crashes_-_Case_Information__Four_Year_Window_*.csv` | <https://data.ny.gov/> → search **"Motor Vehicle Crashes"** | NYSDOT incident data — rolled up to monthly per-county in ETL. |
| `MTA_Monthly_Ridership___Traffic_Data__Beginning_January_2008_*.csv` | <https://data.ny.gov/> → search **"MTA Monthly Ridership"** | System-level ridership. Used for transit-exposure features. |
| `population.csv` | <https://www.census.gov/data.html> — American Community Survey 5-year county estimates | Annual; interpolated to monthly inside ETL. |

After downloading, your tree should look roughly like:

```
data/raw/
├── Local_Area_Unemployment_Statistics__Beginning_1976_*.csv
├── Supplemental_Nutrition_Assistance_Program_(SNAP)_*.csv
├── Motor_Vehicle_Crashes_*.csv
├── MTA_Monthly_Ridership_*.csv
├── population.csv
└── medicaid/
    └── *.pdf                      # one PDF per reporting month
```

Then run:

```bash
python data/clean_unemployment.py
python data/clean_population.py
python data/extract_medicaid.py
python etl.py
```

This produces `data/outputs/nys_unified.csv` and loads it to the Postgres instance configured in `.env`.
