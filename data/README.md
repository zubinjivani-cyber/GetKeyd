# getkeyd.app Static Reference Data

Static JSON reference files for the getkeyd.app Washington state property lookup feature. These files are loaded at build time and bundled with the app, eliminating the need for external API calls during common ZIP-code and county lookups.

## Files

### wa-zip-lookup.json

Maps Washington state ZIP codes to their corresponding city, county, and FIPS codes. Contains 225+ of the most populous WA ZIP codes.

**Schema:**
```json
{
  "<zip>": {
    "city": "<city name>",
    "county": "<county name>",
    "countyFIPS": "<3-digit county FIPS code>",
    "stateFIPS": "<2-digit state FIPS code>"
  }
}
```

WA state FIPS is always `"53"`.

**Usage:** When a user enters a ZIP code, the app looks it up in this file to determine city, county, and which county API endpoint to query (if available).

### wa-county-info.json

Metadata for all 39 Washington counties, including assessor URLs, API availability, median home values, population estimates, and property tax rates.

**Schema:**
```json
{
  "<countyFIPS>": {
    "name": "<county name>",
    "assessorUrl": "<county assessor website URL>",
    "parcelApi": "<ArcGIS REST endpoint for parcel queries, present only for hasApi: true counties>",
    "salesApi": "<ArcGIS REST endpoint for sales data, present only for hasApi: true counties>",
    "hasApi": <true|false>,
    "medianHomeValue": <integer USD>,
    "population": <integer>,
    "propertyTaxRate": <decimal>
  }
}
```

**Usage:** Once the county is resolved (from ZIP or user input), this file provides the assessor URL for manual lookups, determines whether an automated API query is available (only King County currently), and supplies reference market data.

### wa-school-districts.json

Maps city names (lowercase) to their primary school district, OSPI report card URL, and an approximate rating (1-10).

**Schema:**
```json
{
  "<city slug>": {
    "district": "<school district name>",
    "ospiUrl": "<OSPI Report Card summary URL>",
    "rating": <integer 1-10>
  }
}
```

**Usage:** When displaying property context, the app matches the city (lowercased) to retrieve the local school district name and a link to the OSPI performance report.

### pros.json

Local-services directory for the "Find a Local Pro" page (`pages/pros.html`). Refreshed from public sources by `scripts/refresh-pros.py` - do not hand-edit the API-derived entries.

**Sources:**
- `wa-lni`: WA L&I contractor registry (data.wa.gov dataset `m8qx-ubtq`), ACTIVE handyman-licensed contractors with a WA address. Phone + license only (the registry has no websites/emails).
- `hud`: HUD Single Family Housing Counseling Agencies list, WA entries. Includes websites/emails.
- `curated`: hand-added entries (e.g. home inspectors, pros with websites). Add these yourself with an id starting `cur-`; the refresh script preserves them and merges by id.

**Schema:**
```json
{
  "id": "lni-BOBSH*839MG | hud-<slug> | cur-<slug>",
  "name": "<business name>",
  "category": "Handyman | Home Inspector | Housing Counselor",
  "city": "<city>",
  "county": "<county, when known>",
  "zip": "<5-digit zip>",
  "phone": "<digits and punctuation>",
  "website": "<https URL, empty for L&I rows>",
  "email": "<email, empty for L&I rows>",
  "license": "<L&I registration number, empty for non-contractors>",
  "source": "wa-lni | hud | curated",
  "lastVerified": "<ISO date>"
}
```

**To add a curated pro:** append an entry with `"source": "curated"`, an id starting `cur-`, and (ideally) website/email/license info, then run the refresh script once to re-sort. The script never deletes curated entries.

## Updating

### ZIP codes
- Source: USPS ZIP Code lookup or US Census Bureau ZIP Code Tabulation Areas (ZCTAs)
- Update annually as new ZIPs are added

### County data
- **medianHomeValue:** Update quarterly using Zillow ZHVI or Redfin Data Center
- **population:** Update annually using WA Office of Financial Management (OFM) April 1 estimates
- **propertyTaxRate:** Update annually from WA Department of Revenue levy rate data
- **assessorUrl:** Verify periodically; counties occasionally restructure their sites

### School districts
- **district names:** Validate against OSPI directory
- **ospiUrl schoolId:** Look up current district IDs at https://reportcard.ospi.k12.wa.us/
- **rating:** Update annually based on Niche, GreatSchools, or OSPI performance index scores

### Pros directory
- Run `python3 scripts/refresh-pros.py` (from the repo root) to re-pull L&I + HUD data. The script is idempotent and preserves `cur-*` entries.
- For automation: a GitHub Actions weekly cron running that command and committing `data/pros.json` keeps license status fresh with no server.
