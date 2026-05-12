from pathlib import Path
import pandas as pd
import json
from datetime import datetime

BASE_DIR = Path(__file__).parent

csv_file = BASE_DIR / "WINkel Weken Nieuw-Vennep 12-05-2026 participants.csv"
json_file = BASE_DIR / "campaign-test.json"

df = pd.read_csv(csv_file)

# Pas deze namen aan naar jouw CSV-kolommen
column_mapping = {
    "status": "Status",
    "prijs_gewonnen": "Prijs gewonnen",
    "coupon_type": "prize",
    "coupon_waarde": "Coupon waarde",
    "winkel_inwissel": "Winkel inwissel",
    "winkel_uitgever": "location",
    "leeftijdsgroep": "Leeftijdsgroep",
    "wat_is_uw_leeftijd": "wat_is_uw_leeftijd?",
    "wat_is_uw_geslacht": "wat_is_uw_geslacht?",
    "kanaal": "Kanaal",
    "datum_uitgeleverd": "clamedAt",
    "datum_opgehaald": "collectedAt",
}

def empty_to_none(value):
    if pd.isna(value) or str(value).strip() == "":
        return None
    return value

def parse_bool(value):
    if pd.isna(value):
        return False
    return str(value).strip().lower() in ["true", "ja", "yes", "1"]

def calculate_age_group(row):
    age_col = column_mapping.get("wat_is_uw_leeftijd")

    if not age_col or age_col not in row or pd.isna(row[age_col]):
        return "Onbekend"

    try:
        age = int(float(str(row[age_col]).strip()))
    except Exception:
        return "Onbekend"

    if age <= 0 or age > 120:
        return "Onbekend"

    if age < 18:
        return "<18"
    if age <= 24:
        return "18-24"
    if age <= 34:
        return "25-34"
    if age <= 44:
        return "35-44"
    if age <= 54:
        return "45-54"
    if age <= 64:
        return "55-64"

    return "65+"

def calculate_prijsgewonnen(row):
    coupon_col = column_mapping.get("coupon_type")
    if coupon_col and coupon_col in row:
        return not pd.isna(row[coupon_col]) and str(row[coupon_col]).strip() != ""
    return False

def calculate_status(row):
    prijsgewonnen = calculate_prijsgewonnen(row)

    opgehaald_col = column_mapping.get("datum_opgehaald")
    if opgehaald_col and opgehaald_col in row:
        if not pd.isna(row[opgehaald_col]) and str(row[opgehaald_col]).strip() != "":
            return "redeemed"

    if prijsgewonnen:
        return "claimed"

    return "registered"

def format_date(value):
    if pd.isna(value) or str(value).strip() == "":
        return None

    try:
        dt = pd.to_datetime(value, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None

records = []

for _, row in df.iterrows():
    item = {}

    # Direct gemapte velden
    for json_key, csv_col in column_mapping.items():
        if json_key == "geboortedatum":
            continue

        if csv_col in df.columns:
            if json_key in ["datum_uitgeleverd", "datum_opgehaald"]:
                item[json_key] = format_date(row[csv_col])
            else:
                item[json_key] = empty_to_none(row[csv_col])
        else:
            item[json_key] = None

    # Berekende velden
    item["leeftijdsgroep"] = calculate_age_group(row)
    item["prijs_gewonnen"] = calculate_prijsgewonnen(row)
    item["status"] = calculate_status(row)

    # Fallbacks
    if item["kanaal"] is None:
        item["kanaal"] = "Onbekend"

    records.append(item)

with open(json_file, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"JSON opgeslagen als: {json_file}")
print(f"Aantal records: {len(records)}")