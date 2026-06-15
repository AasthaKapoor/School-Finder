# Claude Code Project Brief: UK Primary School Research Assistant

## Project Overview

Build a web application that helps UK parents research and shortlist primary schools for their child's Reception or Year 7 entry. The app takes a parent's location and priorities, pulls from public DfE and Ofsted data sources, and generates a structured, AI-powered research report per school — culminating in a ranked shortlist of up to 6 choices that mirrors the real LA application process.

The target users are parents navigating the September–January application window for the following September's school entry.

---

## Tech Stack

- **Frontend:** React (Vite) with Tailwind CSS
- **Backend:** Node.js + Express (REST API)
- **AI layer:** Anthropic Claude API (`claude-sonnet-4-20250514`) for generating school summaries and pros/cons from Ofsted narrative text
- **Data sources:** DfE GIAS API, Ofsted data downloads, DfE school performance tables
- **Distance calculation:** Haversine formula (straight-line, as used by LAs)
- **PDF export:** `pdf-lib` or `react-pdf`
- **Maps:** Leaflet.js with OpenStreetMap tiles
- **Geocoding:** Postcodes.io API (free, no key required)
- **Storage:** localStorage for saved profiles and shortlists (MVP — no auth required)

---

## Folder Structure

```
school-finder/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchPanel/       # Filters and postcode input
│   │   │   ├── SchoolCard/        # Individual school report card
│   │   │   ├── Shortlist/         # Shortlist manager (max 6)
│   │   │   ├── CompareTable/      # Side-by-side comparison
│   │   │   ├── DistanceBadge/     # Green/amber/red admission estimator
│   │   │   ├── MapView/           # Leaflet map with school pins
│   │   │   └── TimelineWidget/    # Application calendar
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Search + results
│   │   │   ├── SchoolDetail.jsx   # Full report for one school
│   │   │   ├── Shortlist.jsx      # Manage and compare shortlist
│   │   │   └── Export.jsx         # PDF export preview
│   │   ├── hooks/
│   │   │   ├── useSchools.js      # Fetch and cache school data
│   │   │   ├── useDistance.js     # Postcode → coordinates → distance
│   │   │   └── useShortlist.js    # localStorage shortlist state
│   │   └── utils/
│   │       ├── haversine.js       # Straight-line distance calculator
│   │       ├── ofstedParser.js    # Parse Ofsted rating codes
│   │       └── scoreSchool.js     # Priority weighting algorithm
├── server/
│   ├── routes/
│   │   ├── schools.js             # GIAS API proxy + enrichment
│   │   ├── ofsted.js              # Ofsted data lookup
│   │   ├── performance.js         # DfE KS2 performance data
│   │   └── summarise.js           # Claude API: generate school summary
│   ├── services/
│   │   ├── giasService.js         # Get Information About Schools API
│   │   ├── ofstedService.js       # Ofsted ratings data
│   │   ├── performanceService.js  # KS2/KS4 attainment data
│   │   └── claudeService.js       # Anthropic API calls
│   └── index.js
├── data/
│   └── admission-distances/       # Manually curated CSV files per LA
│       ├── sutton-2024.csv
│       ├── bromley-2024.csv
│       └── barnet-2024.csv
├── .env
└── README.md
```

---

## Phase 1: MVP (Build This First)

### Step 1 — Project Setup
- Scaffold the Vite + React frontend and Express backend
- Install dependencies: `axios`, `tailwindcss`, `leaflet`, `react-leaflet`, `pdf-lib`, `@anthropic-ai/sdk`
- Create `.env` with `ANTHROPIC_API_KEY` and a `PORT` variable
- Set up CORS on the Express server so the React client can call it

### Step 2 — Postcode & Location Input
- Build the `SearchPanel` component with:
  - A postcode input field (validate UK postcode format with regex)
  - A radius dropdown: 0.5 mi / 1 mi / 2 mi / 3 mi / 5 mi
  - A school type selector: Primary / Secondary / Grammar / All
  - A year group selector: Reception (age 4) / Year 7 (age 11)
- On submit, call the Postcodes.io API to convert postcode → `{ lat, lng }`
- Store coordinates in React state

### Step 3 — Fetch Schools from GIAS
- The DfE provides the **Get Information About Schools (GIAS)** dataset as a downloadable CSV at:
  `https://www.get-information-schools.service.gov.uk/Downloads`
- Download the `edubasealldata` CSV and serve it from the Express backend (cache locally — it updates monthly)
- Build a `/api/schools` endpoint that:
  - Accepts `lat`, `lng`, `radiusMiles`, `schoolType`, `phase` as query params
  - Filters the GIAS data to schools within the radius using the Haversine formula
  - Returns: `URN`, `name`, `address`, `postcode`, `lat`, `lng`, `schoolType`, `phase`, `religiousCharacter`, `capacity`, `numberOfPupils`

### Step 4 — Ofsted Ratings
- Download the Ofsted ratings data from:
  `https://www.compare-school-performance.service.gov.uk/download-data`
  (or use the Ofsted API if available)
- Match schools by `URN` to get: `overallEffectiveness`, `qualityOfEducation`, `behaviourAndAttitudes`, `personalDevelopment`, `leadershipAndManagement`, `dateOfLastInspection`
- Ofsted rating codes: 1 = Outstanding, 2 = Good, 3 = Requires Improvement, 4 = Inadequate
- Enrich the `/api/schools` response with this data

### Step 5 — KS2 Performance Data
- Download the DfE school performance tables from:
  `https://www.find-school-performance-data.service.gov.uk/`
  (annual CSV download, keyed by URN)
- Key fields to extract:
  - `KS2_READ_PROG` — reading progress score
  - `KS2_WRITE_PROG` — writing progress score
  - `KS2_MATHS_PROG` — maths progress score
  - `KS2_AVERAGE_SCORE` — average attainment score
  - `P8SCORE` — Progress 8 (for secondary)
- Add a `/api/performance/:urn` endpoint

### Step 6 — Distance Calculator
- Implement `haversine.js`:
```js
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```
- For each school returned, calculate distance from parent's postcode
- Display as miles to 2 decimal places

### Step 7 — Priority Scoring Algorithm
- Build `scoreSchool.js` that takes a school object and a `priorities` object from the filter panel
- Priority weights (user-configurable via sliders, 0–5):
  - `academics` → weighted average of KS2 progress scores
  - `ofsted` → score from 1–4 (inverted: Outstanding = 4 points)
  - `sen` → flag from GIAS: `specialEducationalNeeds` provision type
  - `extracurricular` → extracted from Ofsted report text via Claude
  - `grammarFeeder` → sourced from curated admission distance CSVs
  - `faith` → match against user's stated faith preference
- Produce a composite score per school; sort results by this score

### Step 8 — AI School Summary (Claude API)
- Build a `/api/summarise` POST endpoint in `claudeService.js`
- For each school, pass the following to Claude:
  - School name, Ofsted rating, KS2 scores, religious character, school type
  - The Ofsted inspection report text (if available via scraping or manual curation)
- Prompt to use:

```
You are a helpful assistant for UK parents researching primary schools.

Given the following data about a school, write a concise school summary card with these sections:

1. **Overview** (2 sentences): What kind of school is this, and what is it best known for?
2. **Academic strengths**: What do the KS2 scores and Ofsted judgements say about academic quality?
3. **Pros** (3 bullet points): Specific strengths based on the data.
4. **Cons** (2 bullet points): Honest limitations or concerns.
5. **Best suited for**: What type of child or family would this school suit well?

Be factual, specific, and balanced. Do not use generic praise. Base everything on the data provided.

School data:
{JSON.stringify(schoolData)}
```

- Cache the Claude response in memory (or a simple JSON file) keyed by URN to avoid redundant API calls
- Return the summary as structured JSON with the five fields above

### Step 9 — Admission Distance Feature
- Create a `data/admission-distances/` folder
- Manually populate CSVs from LA admission booklets for the following LAs to start: Sutton, Bromley, Barnet, Kingston, Merton
- CSV schema:
  ```
  urn, school_name, year, last_distance_miles, oversubscribed, notes
  ```
- Build a `/api/admissions/:urn` endpoint to serve this data
- In the `DistanceBadge` component, compare parent's distance to school against `last_distance_miles`:
  - Green: parent distance < 80% of last cutoff
  - Amber: parent distance between 80%–110% of last cutoff
  - Red: parent distance > 110% of last cutoff

### Step 10 — School Card UI
Each school in the results list should render a `SchoolCard` with:
- School name, address, school type badge
- Ofsted rating badge (colour-coded: Outstanding = dark green, Good = green, RI = amber, Inadequate = red)
- Distance from parent's postcode
- Admission distance badge (green / amber / red)
- KS2 attainment bar (vs national average)
- AI-generated 2-line overview
- "View full report" button → `SchoolDetail` page
- "Add to shortlist" button (disabled if shortlist = 6)

### Step 11 — Shortlist Manager
- Maximum 6 schools (mirrors the real LA application form)
- Drag-to-reorder (use `@dnd-kit/core`)
- Shortlist persisted in `localStorage`
- "Compare selected" button opens the `CompareTable` view

### Step 12 — Side-by-Side Comparison Table
- Rows: Ofsted overall, KS2 attainment, KS2 progress, distance, admission cutoff, religious character, SEN provision, school size
- Columns: each shortlisted school
- Highlight the best value in each row in green

### Step 13 — Map View
- Leaflet map centred on parent's postcode
- Pin for each school in results, colour-coded by Ofsted rating
- Click a pin → show school name + Ofsted rating popup with "Add to shortlist" button
- Toggle button to switch between list view and map view

### Step 14 — Application Timeline Widget
- Hardcoded UK school application calendar:
  - September: Applications open
  - October–December: Open days (link to school website)
  - 15 January: Application deadline (state schools)
  - 16 April (National Offer Day): Results
  - May: Waiting list period begins
- Display as a visual horizontal timeline
- Show today's date marker so parents can see where they are in the process

---

## Phase 2 (Build After MVP is Working)

- **Grammar school pathway planner**: Filter primaries by % of Year 6 leavers who pass 11+ (requires manual data curation per borough — start with Sutton and Bromley)
- **Historical distance trends**: If you have 2–3 years of admission distance data per school, show a sparkline chart of whether the catchment is shrinking or expanding
- **Open day tracker**: Scrape or manually curate open day dates per school; let parents mark which they've attended
- **Sibling priority checker**: Prompt the user whether they have a sibling at any school; flag schools where sibling priority meaningfully widens the effective catchment
- **Faith school eligibility checker**: For CoE and Catholic schools with faith oversubscription criteria, prompt the user for their faith and baptism status, and flag whether they are likely to qualify under faith criteria
- **PDF export**: Generate a formatted PDF of the full shortlist report using `pdf-lib`, including all school cards and the comparison table
- **Saved profiles**: Allow parents to save and reload their postcode + priority settings between sessions (extend the current localStorage approach)

---

## Key API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schools?lat=&lng=&radius=&phase=` | Schools within radius, enriched with Ofsted |
| GET | `/api/performance/:urn` | KS2/KS4 performance data for a school |
| GET | `/api/admissions/:urn` | Last year's admission cutoff distance |
| POST | `/api/summarise` | Claude-generated school summary card |
| GET | `/api/geocode?postcode=` | Postcode → lat/lng via Postcodes.io |

---

## Design Direction

The app should feel calm, trustworthy, and parent-friendly — not like a government portal. Use:
- Clean white backgrounds with soft grey section dividers
- A primary colour of deep teal (`#1a6b6b`) for CTAs and badges
- Ofsted badge colours: Outstanding = `#1a6b6b`, Good = `#2d8a4e`, RI = `#d97706`, Inadequate = `#dc2626`
- Font: Inter (body) + a slightly heavier weight for school names
- Cards with subtle box shadows, 8px border radius
- Mobile-responsive layout (many parents will use this on their phone)

---

## Environment Variables Needed

```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
NODE_ENV=development
```

---

## Important Notes for Implementation

1. **GIAS data**: Download the full CSV once and cache it locally in `data/gias-schools.csv`. Do not call a live API on every request — the file is ~50MB and updates monthly.
2. **Ofsted data**: Similarly, download the Ofsted ratings CSV from the Ofsted website and cache locally in `data/ofsted-ratings.csv`.
3. **Claude API calls**: Always cache summaries by URN to a local JSON file (`data/summaries-cache.json`). The Claude API should only be called once per school, not on every page load.
4. **Admission distances**: These do not exist in any public API. They must be manually extracted from LA admission booklets (PDFs published each autumn). Start with Sutton and Bromley LAs only for the MVP.
5. **No authentication required for MVP**: Use localStorage for all user state (shortlist, saved postcode, priorities).

---

## First Command to Run

```bash
mkdir school-finder && cd school-finder
npm create vite@latest client -- --template react
mkdir server && cd server && npm init -y
npm install express cors axios dotenv @anthropic-ai/sdk
cd ../client && npm install axios leaflet react-leaflet @dnd-kit/core tailwindcss
```

Start with Step 2 (the search panel and postcode lookup) to get something visible on screen quickly, then work through the steps in order.
