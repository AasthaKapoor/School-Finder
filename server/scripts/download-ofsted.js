#!/usr/bin/env node
/**
 * Downloads the Ofsted Management Information CSV and saves to data/ofsted.json
 * Run: npm run download-ofsted  (from server/)
 *
 * Output format: lookup object keyed by URN
 *   { "100000": { grade, label, date, qualityOfEducation, leadershipAndManagement,
 *                 behaviourAndAttitudes, personalDevelopment, earlyYearsProvision,
 *                 sixthFormProvision, previousGrade } }
 *
 * If auto-download is blocked, place the CSV or ZIP manually at:
 *   data/ofsted.csv   or   data/ofsted-mi.zip
 * then re-run this script.
 */
'use strict'

const path = require('path')
const fs   = require('fs')
const axios = require('axios')
const AdmZip = require('adm-zip')
const { parse: parseCSV } = require('csv-parse/sync')

const STATS_URL     = 'https://www.gov.uk/government/statistics/monthly-management-information-ofsteds-school-inspections-outcomes'
const CONTENT_API   = 'https://www.gov.uk/api/content/government/statistics/monthly-management-information-ofsteds-school-inspections-outcomes'
const OUT_PATH   = path.join(__dirname, '../../data/ofsted.json')
const LOCAL_CSV  = path.join(__dirname, '../../data/ofsted.csv')
const LOCAL_ZIP  = path.join(__dirname, '../../data/ofsted-mi.zip')

const LABELS = { 1: 'Outstanding', 2: 'Good', 3: 'Requires improvement', 4: 'Inadequate' }

// Column name candidates — covers the current "management information" CSV format
// plus legacy column names from older releases
const COLS = {
  urn:        ['URN'],
  date:       ['Inspection start date of latest OEIF graded inspection', 'Inspection start date', 'Inspection date'],
  overall:    ['Latest OEIF overall effectiveness', 'Overall effectiveness', 'Overall Effectiveness'],
  education:  ['Latest OEIF quality of education', 'Quality of education'],
  leadership: ['Latest OEIF effectiveness of leadership and management', 'Leadership and management'],
  behaviour:  ['Latest OEIF behaviour and attitudes', 'Behaviour and attitudes'],
  personal:   ['Latest OEIF personal development', 'Personal development'],
  earlyYears: ['Latest OEIF early years provision (where applicable)', 'Early years (where applicable)', 'Early years provision'],
  sixthForm:  ['Latest OEIF sixth form provision (where applicable)', 'Post-16 provision (where applicable)', 'Sixth form provision'],
  previous:   ['Previous full inspection overall effectiveness'],
}

function get(row, candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined) return (row[c] ?? '').trim()
  }
  return ''
}

function parseGrade(raw) {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.toUpperCase() === 'NULL') return null
  const n = parseInt(trimmed, 10)
  // Ofsted uses 1–4 for grades; 5–9 are special codes (N/A, monitoring, etc.)
  if (!isNaN(n) && n >= 1 && n <= 4) return n
  const MAP = { outstanding: 1, good: 2, 'requires improvement': 3, inadequate: 4 }
  return MAP[trimmed.toLowerCase()] ?? null
}

function parseDate(raw) {
  if (!raw) return null
  // dd/mm/yyyy
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // Natural language ("1 January 2023")
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function mapRow(row) {
  const urn = get(row, COLS.urn)
  if (!urn) return null

  const overall = parseGrade(get(row, COLS.overall))
  if (!overall) return null

  return {
    urn,
    grade:                  overall,
    label:                  LABELS[overall] ?? 'Unknown',
    date:                   parseDate(get(row, COLS.date)),
    qualityOfEducation:     parseGrade(get(row, COLS.education)),
    leadershipAndManagement: parseGrade(get(row, COLS.leadership)),
    behaviourAndAttitudes:  parseGrade(get(row, COLS.behaviour)),
    personalDevelopment:    parseGrade(get(row, COLS.personal)),
    earlyYearsProvision:    parseGrade(get(row, COLS.earlyYears)),
    sixthFormProvision:     parseGrade(get(row, COLS.sixthForm)),
    previousGrade:          parseGrade(get(row, COLS.previous)),
  }
}

function parseCsvBuffer(buf) {
  return parseCSV(buf, {
    columns:              true,
    bom:                  true,
    skip_empty_lines:     true,
    relax_column_count:   true,
  })
}

function yearFromUrl(url) {
  // GOV.UK asset URLs encode spaces as _20 (e.g. _2031_20August = " 31 August").
  // Decode before extracting years to avoid false positives like "2031".
  const filename = url.split('/').pop().replace(/_20/g, ' ')
  const years = [...filename.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1], 10))
  return years.length ? Math.max(...years) : 0
}

function extractLinks(html) {
  return [...html.matchAll(/href="(https:\/\/assets\.publishing\.service\.gov\.uk[^"]+\.(zip|csv|xlsx))"/gi)]
    .map(m => ({ url: m[1], ext: m[2].toLowerCase(), year: yearFromUrl(m[1]) }))
    .sort((a, b) => b.year - a.year)
}

function bestLink(matches) {
  // Among the most recent year's files, prefer CSV > ZIP > XLSX
  if (!matches.length) return null
  const topYear = matches[0].year
  const recent  = matches.filter(m => m.year === topYear || m.year >= topYear - 1)
  return recent.find(m => m.ext === 'csv')
      ?? recent.find(m => m.ext === 'zip')
      ?? recent.find(m => m.ext === 'xlsx')
      ?? matches[0]
}

async function findDownloadUrl() {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; school-finder/1.0)' }

  // 1. Try the GOV.UK content API — returns JSON with the CURRENT release's attachment HTML,
  //    avoiding the thousands of historical links in the rendered statistics page.
  try {
    console.log('Querying GOV.UK content API…')
    const resp = await axios.get(CONTENT_API, { timeout: 30_000, headers })
    const body  = resp.data
    // details.documents is an array of HTML strings, one per attachment in the current release
    const docsHtml = (body?.details?.documents ?? []).join('\n')
    const matches  = extractLinks(docsHtml)
    if (matches.length) {
      const pick = bestLink(matches)
      console.log(`  Content API: ${matches.length} attachment(s), picking → ${pick.url}`)
      return pick
    }
    console.warn('  Content API returned no attachment links.')
  } catch (err) {
    console.warn(`  Content API failed: ${err.message}`)
  }

  // 2. Fall back to scraping the HTML page (may only include historical files)
  console.log('Falling back to HTML page scrape…')
  const resp    = await axios.get(STATS_URL, { timeout: 30_000, headers })
  const matches = extractLinks(String(resp.data))
  console.log(`  Found ${matches.length} attachment(s); top: ${matches[0]?.url ?? 'none'}`)
  return bestLink(matches)
}

async function downloadUrl(url) {
  console.log(`Downloading: ${url}`)
  const resp = await axios.get(url, {
    responseType:  'arraybuffer',
    timeout:       120_000,
    maxRedirects:  10,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; school-finder/1.0)' },
    onDownloadProgress: (e) => {
      const mb  = (e.loaded / 1024 / 1024).toFixed(1)
      const pct = e.total ? `${Math.round((e.loaded / e.total) * 100)}%  ` : ''
      process.stdout.write(`\r  ${pct}${mb} MB…`)
    },
  })
  console.log()
  return Buffer.from(resp.data)
}

async function getRaw() {
  // 1. Prefer manually placed files (useful when the site is IP-blocked)
  if (fs.existsSync(LOCAL_ZIP)) {
    console.log(`Using local ZIP: ${LOCAL_ZIP}`)
    return { buffer: fs.readFileSync(LOCAL_ZIP), isZip: true }
  }
  if (fs.existsSync(LOCAL_CSV)) {
    console.log(`Using local CSV: ${LOCAL_CSV}`)
    return { buffer: fs.readFileSync(LOCAL_CSV), isZip: false }
  }

  // 2. Try auto-download
  try {
    const found = await findDownloadUrl()
    if (found) {
      const buffer = await downloadUrl(found.url)
      return { buffer, isZip: found.isZip }
    }
    console.warn('No CSV/ZIP link found on the statistics page.')
  } catch (err) {
    console.warn(`Auto-download failed: ${err.message}`)
  }

  throw Object.assign(new Error('MANUAL_NEEDED'), { manual: true })
}

async function main() {
  let raw
  try {
    raw = await getRaw()
  } catch (err) {
    if (err.manual) {
      console.error(`
Unable to auto-download Ofsted data.

To download manually:
  1. Open: ${STATS_URL}
  2. Download the "Management information" CSV or ZIP
  3. Save to: ${LOCAL_CSV}
     (or as a ZIP: ${LOCAL_ZIP})
  4. Re-run: npm run download-ofsted
`)
      process.exit(1)
    }
    throw err
  }

  let csvBuffers = []

  if (raw.isZip) {
    console.log('Extracting files from ZIP…')
    const zip        = new AdmZip(raw.buffer)
    const allEntries = zip.getEntries()
    console.log(`  ZIP contains: ${allEntries.map(e => e.entryName).join(', ')}`)
    const csvEntries  = allEntries.filter(e => e.entryName.toLowerCase().endsWith('.csv'))
    if (!csvEntries.length) {
      const xlsxEntries = allEntries.filter(e => e.entryName.toLowerCase().endsWith('.xlsx'))
      if (xlsxEntries.length) {
        throw new Error(`ZIP contains only XLSX files (${xlsxEntries.map(e => e.entryName).join(', ')}). Download the CSV version manually from:\n  ${STATS_URL}`)
      }
      throw new Error(`No CSV files found in ZIP (contains: ${allEntries.map(e => e.entryName).join(', ')})`)
    }
    for (const e of csvEntries) {
      console.log(`  Extracting: ${e.entryName}`)
      csvBuffers.push(zip.readFile(e))
    }
  } else {
    csvBuffers = [raw.buffer]
  }

  console.log('Parsing CSV(s)…')
  const lookup = {}
  let kept = 0
  let skipped = 0

  for (const buf of csvBuffers) {
    const rows = parseCsvBuffer(buf)
    for (const row of rows) {
      const entry = mapRow(row)
      if (entry) {
        const existing = lookup[entry.urn]
        // Keep the most recent inspection when a school appears in multiple CSVs
        if (!existing || (entry.date && (!existing.date || entry.date > existing.date))) {
          if (existing) kept-- // avoid double-counting
          lookup[entry.urn] = entry
          kept++
        }
      } else {
        skipped++
      }
    }
  }

  console.log(`  ${kept.toLocaleString()} inspection records kept, ${skipped.toLocaleString()} rows skipped (no URN or grade)`)

  const outDir = path.dirname(OUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(OUT_PATH, JSON.stringify(lookup, null, 2))
  console.log(`\nSaved → ${OUT_PATH}`)
  console.log(`Schools with Ofsted data: ${Object.keys(lookup).length.toLocaleString()}`)
  console.log(`File size: ${(fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1)} MB`)
}

main().catch(err => {
  console.error('\nError:', err.message)
  process.exit(1)
})
