#!/usr/bin/env node
/**
 * Downloads all open establishments from GIAS and saves to data/schools.json
 * Run: npm run download-schools  (from server/)
 *
 * GIAS fields mapped:
 *   URN → urn
 *   EstablishmentName → name
 *   TypeOfEstablishment (name) → type
 *   PhaseOfEducation (name) → phase
 *   Postcode → postcode
 *   Street + Town → address
 *   Easting/Northing → lat/lng  (OSGB36 → WGS84)
 *   SchoolWebsite → website
 *   LA (name) → localAuthority
 *   Gender (name) → gender
 */
'use strict'

const path = require('path')
const fs = require('fs')
const axios = require('axios')
const AdmZip = require('adm-zip')
const { parse: parseCSV } = require('csv-parse/sync')

const GIAS_URL =
  'https://www.get-information-schools.service.gov.uk/Establishments/Establishment/Download/open'
const OUT_PATH = path.join(__dirname, '../../data/schools.json')

// ---------------------------------------------------------------------------
// Coordinate conversion: OS National Grid (OSGB36) → WGS84
// Based on OS document "A Guide to coordinate systems in Great Britain"
// Accurate to ~5 m across Great Britain.
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

function osgridToLatLng(easting, northing) {
  // --- Airy 1830 ellipsoid (OSGB36) ---
  const a = 6377563.396
  const b = 6356256.909
  const F0 = 0.9996012717
  const lat0 = 49 * DEG
  const lon0 = -2 * DEG
  const N0 = -100000
  const E0 = 400000
  const e2 = 1 - (b * b) / (a * a)
  const n = (a - b) / (a + b)
  const n2 = n * n
  const n3 = n * n * n

  // Iterative inverse Transverse Mercator
  let lat = lat0
  let M = 0
  let iter = 0
  do {
    lat = (northing - N0 - M) / (a * F0) + lat
    const Ma = (1 + n + 1.25 * n2 + 1.25 * n3) * (lat - lat0)
    const Mb = (3 * n + 3 * n2 + 2.625 * n3) * Math.sin(lat - lat0) * Math.cos(lat + lat0)
    const Mc = 1.875 * (n2 + n3) * Math.sin(2 * (lat - lat0)) * Math.cos(2 * (lat + lat0))
    const Md = (35 / 24) * n3 * Math.sin(3 * (lat - lat0)) * Math.cos(3 * (lat + lat0))
    M = b * F0 * (Ma - Mb + Mc - Md)
    iter++
  } while (Math.abs(northing - N0 - M) >= 1e-5 && iter < 100)

  const sinL = Math.sin(lat)
  const cosL = Math.cos(lat)
  const tanL = Math.tan(lat)
  const tan2 = tanL * tanL
  const tan4 = tan2 * tan2
  const nu = a * F0 / Math.sqrt(1 - e2 * sinL * sinL)
  const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sinL * sinL, 1.5)
  const eta2 = nu / rho - 1
  const sec = 1 / cosL
  const dE = easting - E0

  const VII = tanL / (2 * rho * nu)
  const VIII = tanL / (24 * rho * nu ** 3) * (5 + 3 * tan2 + eta2 - 9 * tan2 * eta2)
  const IX = tanL / (720 * rho * nu ** 5) * (61 + 90 * tan2 + 45 * tan4)
  const X = sec / nu
  const XI = sec / (6 * nu ** 3) * (nu / rho + 2 * tan2)
  const XII = sec / (120 * nu ** 5) * (5 + 28 * tan2 + 24 * tan4)
  const XIIA = sec / (5040 * nu ** 7) * (61 + 662 * tan2 + 1320 * tan4 + 720 * tan2 * tan4)

  const osgb36Lat = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6
  const osgb36Lon = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7

  // --- OSGB36 lat/lon → Cartesian ---
  const sinO = Math.sin(osgb36Lat)
  const cosO = Math.cos(osgb36Lat)
  const nuO = a / Math.sqrt(1 - e2 * sinO * sinO)

  const x1 = nuO * cosO * Math.cos(osgb36Lon)
  const y1 = nuO * cosO * Math.sin(osgb36Lon)
  const z1 = (1 - e2) * nuO * sinO

  // --- Helmert transformation: OSGB36 → WGS84 ---
  const tx = 446.448, ty = -125.157, tz = 542.06
  const rx = (0.1502 / 3600) * DEG
  const ry = (0.2470 / 3600) * DEG
  const rz = (0.8421 / 3600) * DEG
  const s = 1 - 20.4894e-6

  const x2 = tx + s * (x1 + rz * y1 - ry * z1)
  const y2 = ty + s * (-rz * x1 + y1 + rx * z1)
  const z2 = tz + s * (ry * x1 - rx * y1 + z1)

  // --- Cartesian → WGS84 lat/lon ---
  const aW = 6378137.0
  const bW = 6356752.3142
  const e2W = 1 - (bW * bW) / (aW * aW)
  const e2Wp = (aW * aW - bW * bW) / (bW * bW)

  const p = Math.sqrt(x2 * x2 + y2 * y2)
  const theta = Math.atan2(z2 * aW, p * bW)

  const latW = Math.atan2(
    z2 + e2Wp * bW * Math.sin(theta) ** 3,
    p - e2W * aW * Math.cos(theta) ** 3
  )
  const lonW = Math.atan2(y2, x2)

  return {
    lat: +(latW * RAD).toFixed(6),
    lng: +(lonW * RAD).toFixed(6),
  }
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

function mapRow(row) {
  // GIAS CSV headers have inconsistent casing/spacing — normalise them
  const get = (key) => (row[key] ?? '').trim()

  const status = get('EstablishmentStatus (name)')
  if (status !== 'Open') return null

  const eastingStr = get('Easting')
  const northingStr = get('Northing')
  const easting = parseFloat(eastingStr)
  const northing = parseFloat(northingStr)

  if (!easting || !northing) return null // skip schools without grid ref

  const coords = osgridToLatLng(easting, northing)

  const street = get('Street')
  const town = get('Town')
  const address = [street, town].filter(Boolean).join(', ')

  return {
    urn: get('URN'),
    name: get('EstablishmentName'),
    type: get('TypeOfEstablishment (name)'),
    phase: get('PhaseOfEducation (name)'),
    address,
    postcode: get('Postcode'),
    lat: coords.lat,
    lng: coords.lng,
    localAuthority: get('LA (name)'),
    gender: get('Gender (name)'),
    website: get('SchoolWebsite'),
  }
}

// ---------------------------------------------------------------------------
// Source resolution: auto-download or use a manually placed file
// ---------------------------------------------------------------------------

const LOCAL_ZIP = path.join(__dirname, '../../data/gias-open.zip')
const LOCAL_CSV = path.join(__dirname, '../../data/gias-open.csv')

async function getRawBuffer() {
  // 1. Prefer a manually placed file (useful when the site is IP-blocked)
  if (fs.existsSync(LOCAL_ZIP)) {
    console.log(`Using local file: ${LOCAL_ZIP}`)
    return { buffer: fs.readFileSync(LOCAL_ZIP), isZip: true }
  }
  if (fs.existsSync(LOCAL_CSV)) {
    console.log(`Using local file: ${LOCAL_CSV}`)
    return { buffer: fs.readFileSync(LOCAL_CSV), isZip: false }
  }

  // 2. Try auto-download
  console.log(`Downloading from GIAS…\n  ${GIAS_URL}`)
  const response = await axios.get(GIAS_URL, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml,application/zip,*/*',
    },
    onDownloadProgress: (e) => {
      const mb = (e.loaded / 1024 / 1024).toFixed(1)
      if (e.total) {
        process.stdout.write(`\r  ${Math.round((e.loaded / e.total) * 100)}%  (${mb} MB)`)
      } else {
        process.stdout.write(`\r  ${mb} MB downloaded…`)
      }
    },
  })
  console.log()

  const buf = Buffer.from(response.data)
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b  // PK magic bytes
  return { buffer: buf, isZip }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let raw
  try {
    raw = await getRawBuffer()
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 401) {
      console.error(`
GIAS auto-download blocked (${err.response.status}).

To get the data manually:
  1. Open in your browser:
     ${GIAS_URL}
  2. Download the ZIP file
  3. Save it to:
     ${LOCAL_ZIP}
  4. Re-run:  npm run download-schools
`)
      process.exit(1)
    }
    throw err
  }

  let csvBuffer
  if (raw.isZip) {
    console.log('Extracting CSV from ZIP…')
    const zip = new AdmZip(raw.buffer)
    const entry = zip.getEntries().find(e => e.entryName.endsWith('.csv'))
    if (!entry) throw new Error('No CSV file found in ZIP')
    console.log(`  Found: ${entry.entryName}`)
    csvBuffer = zip.readFile(entry)
  } else {
    csvBuffer = raw.buffer
  }

  console.log('Parsing CSV…')
  const rows = parseCSV(csvBuffer, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
  console.log(`  ${rows.length.toLocaleString()} rows read`)

  console.log('Mapping and converting coordinates…')
  const schools = []
  let skipped = 0
  for (const row of rows) {
    const school = mapRow(row)
    if (school) {
      schools.push(school)
    } else {
      skipped++
    }
  }
  console.log(`  ${schools.length.toLocaleString()} schools kept, ${skipped.toLocaleString()} skipped (closed / no grid ref)`)

  fs.writeFileSync(OUT_PATH, JSON.stringify(schools, null, 2))
  console.log(`\nSaved → ${OUT_PATH}`)
  console.log(`File size: ${(fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(1)} MB`)
}

main().catch(err => {
  console.error('\nError:', err.message)
  process.exit(1)
})
