from pathlib import Path
import pandas as pd
import json
from io import StringIO

BASE_DIR = Path(__file__).parent

csv_file = BASE_DIR / "WINkel Weken Nieuw-Vennep 12-05-2026 participants.csv"
json_file = BASE_DIR / "campaign-test-fixed.json"

def read_storetime_csv(path: Path) -> pd.DataFrame:
    """
    StoreTime export staat per regel nog een keer volledig tussen quotes.
    Daardoor leest pandas alles als 1 kolom. Deze functie haalt die extra
    buitenste quotes weg en zet dubbele quotes terug naar normale quotes.
    """
    raw = path.read_text(encoding="utf-8-sig")
    cleaned_lines = []

    for line in raw.splitlines():
        line = line.strip()

        if len(line) >= 2 and line[0] == '"' and line[-1] == '"':
            line = line[1:-1]

        line = line.replace('""', '"')
        cleaned_lines.append(line)

    return pd.read_csv(StringIO("\n".join(cleaned_lines)))

df = read_storetime_csv(csv_file)

column_mapping = {
    "code": "code",
    "coupon_type": "prize",
    "coupon_waarde": None,
    "winkel_inwissel": None,
    "winkel_uitgever": "location",
    "wat_is_uw_leeftijd": "wat_is_uw_leeftijd?",
    "wat_is_uw_geslacht": "wat_is_uw_geslacht?",
    "kanaal": None,
    "datum_uitgeleverd": "clamedAt",
    "datum_opgehaald": "collectedAt",
}

def empty_to_none(value):
    if pd.isna(value) or str(value).strip() == "":
        return None
    return str(value).strip()

def format_date(value):
    if pd.isna(value) or str(value).strip() == "":
        return None

    dt = pd.to_datetime(value, dayfirst=True, errors="coerce")
    if pd.isna(dt):
        return None

    return dt.strftime("%Y-%m-%d")

def calculate_age_group(row):
    age_col = column_mapping["wat_is_uw_leeftijd"]

    if age_col not in row or pd.isna(row[age_col]):
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

def has_value(row, csv_col):
    return csv_col in row and not pd.isna(row[csv_col]) and str(row[csv_col]).strip() != ""

def calculate_prijsgewonnen(row):
    return has_value(row, column_mapping["coupon_type"])

def calculate_status(row):
    if has_value(row, column_mapping["datum_opgehaald"]):
        return "redeemed"

    if calculate_prijsgewonnen(row):
        return "claimed"

    return "registered"

records = []

for _, row in df.iterrows():
    item = {}

    for json_key, csv_col in column_mapping.items():
        if csv_col is None:
            item[json_key] = None
            continue

        if csv_col not in df.columns:
            item[json_key] = None
            continue

        if json_key in ["datum_uitgeleverd", "datum_opgehaald"]:
            item[json_key] = format_date(row[csv_col])
        else:
            item[json_key] = empty_to_none(row[csv_col])

    item["leeftijdsgroep"] = calculate_age_group(row)
    item["prijs_gewonnen"] = calculate_prijsgewonnen(row)
    item["status"] = calculate_status(row)

    if item["kanaal"] is None:
        item["kanaal"] = "Onbekend"

    if item["winkel_inwissel"] is None:
        item["winkel_inwissel"] = item["winkel_uitgever"]

    records.append(item)

with open(json_file, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"JSON opgeslagen als: {json_file}")
print(f"Aantal records: {len(records)}")
print(f"Aantal gewonnen prijzen: {sum(1 for r in records if r['prijs_gewonnen'])}")
print(f"Aantal opgehaald/ingewisseld: {sum(1 for r in records if r['status'] == 'redeemed')}")
