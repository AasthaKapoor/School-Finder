# School Finder

Find and compare nearby schools in England. Search by postcode or place name, filter by phase, sector and gender, and see Ofsted ratings at a glance.

## Stack

- **Client** — Vite + React + Tailwind CSS
- **Server** — Node.js + Express
- **Data** — GIAS (Get Information About Schools) + Ofsted Management Information

## Getting started

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Download school data

The data files are not committed to the repo (they're large and updated regularly). Run these once after cloning:

```bash
cd server

# Downloads all open schools from GIAS → data/schools.json (~9 MB)
npm run download-schools

# Downloads Ofsted inspection results → data/ofsted.json (~3 MB)
# If auto-download fails, see the manual step below
npm run download-ofsted
```

#### Ofsted manual download (if the script can't auto-fetch)

The Ofsted statistics page loads recent attachments via JavaScript, which the script can't always reach. If `npm run download-ofsted` fails:

1. Go to: https://www.gov.uk/government/statistics/monthly-management-information-ofsteds-school-inspections-outcomes
2. Download the latest **"Management information – schools"** CSV file
3. Save it as `data/ofsted.csv` (in the project root's `data/` folder)
4. Re-run `npm run download-ofsted` — it will pick up the local file automatically

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in any required values (Claude API key for the AI summary feature, if using).

### 4. Run the app

```bash
# Terminal 1 — API server (port 3001)
cd server && node index.js

# Terminal 2 — Vite dev server (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

## Data refresh

The server automatically refreshes data on a weekly schedule:

| Dataset | Schedule | Script |
|---------|----------|--------|
| GIAS school data | Monday 03:00 | `download-gias.js` |
| Ofsted ratings | Sunday 03:00 | `download-ofsted.js` |

On startup, if either data file is missing, the download runs immediately. No server restart is needed after a refresh — the in-memory cache is cleared automatically.

## Features

- Search by postcode or place name (e.g. "Orpington")
- Filter by phase (Primary / Secondary), sector (State / Independent), gender, and radius
- Sort by distance, Ofsted rating, or name
- Ofsted badge on every school card (Outstanding / Good / Requires improvement / Inadequate)
- School detail page with full Ofsted breakdown (sub-scores, inspection date)
- Shortlist schools and export to PDF
- Map view on school detail page
