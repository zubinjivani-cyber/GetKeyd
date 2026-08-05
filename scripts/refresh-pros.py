#!/usr/bin/env python3
"""Refresh data/pros.json from public sources (zero dependencies).

Sources:
  - WA L&I contractor registry (data.wa.gov SODA): licensed HANDYMAN contractors
  - HUD Single Family Housing Counseling Agencies (public domain CSV)

Curated entries (id starting "cur-", hand-added with websites/emails) are
preserved across refreshes. Run manually or via GitHub Actions cron:

  python3 scripts/refresh-pros.py
"""
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date

ROOT = sys.path[0] + "/.."
OUT = ROOT + "/data/pros.json"
ZIPLOOKUP = ROOT + "/data/wa-zip-lookup.json"

LNI_DATASET = "https://data.wa.gov/resource/m8qx-ubtq.json"
HUD_CSV = ("https://hudgis-hud.opendata.arcgis.com/api/download/v1/"
           "items/aad167f1d819436bb8b539d762716959/csv?layers=0")

TODAY = date.today().isoformat()


def get(url, params=None):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "getkeyd-pros-refresh/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def fetch_lni_handymen():
    """All ACTIVE WA handyman-licensed contractors (paginated SODA pulls)."""
    where = ('specialtycode1desc="HANDYMAN" and '
             'contractorlicensestatus="ACTIVE" and state="WA"')
    pros, offset = [], 0
    while True:
        rows = json.loads(get(LNI_DATASET, {
            "$select": "businessname,city,zip,phonenumber,contractorlicensenumber",
            "$where": where,
            "$limit": 50000, "$offset": offset,
        }))
        if not rows:
            break
        pros += rows
        offset += len(rows)
        if len(rows) < 50000:
            break
    return pros


def fetch_hud_counselors():
    """WA housing counselors from the HUD public list."""
    import csv
    import io
    out = []
    for row in csv.DictReader(io.StringIO(get(HUD_CSV))):
        if (row.get("AGC_STATE") or "").strip().lower() != "washington":
            continue
        website = (row.get("AGC_WEB_SITE") or "").strip()
        if website and not website.startswith("http"):
            website = "https://" + website
        out.append({
            "businessname": row["AGC_NAME"].strip(),
            "city": (row["AGC_CITY"] or "").strip(),
            "zip": (row["AGC_ZIP_CODE"] or "").split("-")[0].strip(),
            "phonenumber": (row["AGC_PHONE_NBR"] or "").strip(),
            "website": website,
            "email": (row["AGC_EMAIL"] or "").strip(),
        })
    return out


def load_zip_lookup():
    with open(ZIPLOOKUP) as f:
        return json.load(f)


def main():
    zips = load_zip_lookup()

    # Keep existing curated entries (hand-added, with websites).
    existing = []
    try:
        with open(OUT) as f:
            existing = json.load(f).get("pros", [])
    except FileNotFoundError:
        pass
    curated = [p for p in existing if p["id"].startswith("cur-")]

    # Handyman listings are curated demo entries (data/pros.json "cur-hm-*") —
    # the bulk L&I pull was removed because it carried no websites/rates.
    pros = curated
    # (L&I handyman registry pull disabled: fetch_lni_handymen kept for reference
    #  only; re-enable by appending rows with source "wa-lni" when the directory
    #  moves past curated entries.)

    for r in fetch_hud_counselors():
        slug = re.sub(r"[^a-z0-9]+", "-", r["businessname"].lower()).strip("-")
        pros.append({
            "id": "hud-" + slug,
            "name": re.sub(r"\s+", " ", r["businessname"]).strip(),
            "category": "Housing Counselor",
            "city": r["city"].title(),
            "county": "",
            "zip": r["zip"],
            "phone": r["phonenumber"],
            "website": r["website"],
            "email": r["email"],
            "license": "",
            "source": "hud",
            "lastVerified": TODAY,
        })

    # Dedupe by id (a re-run must not double entries).
    seen, unique = set(), []
    for p in pros:
        if p["id"] in seen:
            continue
        seen.add(p["id"])
        unique.append(p)

    out = {
        "version": 1,
        "lastUpdated": TODAY,
        "categories": ["Handyman", "Home Inspector", "Housing Counselor"],
        "pros": sorted(unique, key=lambda p: (p["category"], p["city"], p["name"])),
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")

    by_cat = {}
    for p in out["pros"]:
        by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1
    print(f"wrote {OUT}: {len(out['pros'])} pros "
          f"({', '.join(f'{k}: {v}' for k, v in sorted(by_cat.items()))}) "
          f"- {len([p for p in out['pros'] if p['source'] == 'curated'])} curated preserved")


if __name__ == "__main__":
    main()
