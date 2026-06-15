const path = require('path')
const fs   = require('fs')

const DATA_PATH = path.join(__dirname, '../../data/ofsted.json')

let _data = null

function load() {
  if (_data !== null) return _data

  if (!fs.existsSync(DATA_PATH)) {
    console.warn('[ofsted] data/ofsted.json not found — Ofsted ratings unavailable. Run: npm run download-ofsted')
    _data = {}
    return _data
  }

  _data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  console.log(`[ofsted] Loaded ${Object.keys(_data).length.toLocaleString()} Ofsted records`)
  return _data
}

function getLatestInspection(urn) {
  const data = load()
  return data[String(urn)] ?? null
}

// The management information CSV contains one row per school (most recent inspection).
// Returns a single-element array for API consistency; extend if history data is sourced.
function getInspectionHistory(urn) {
  const inspection = getLatestInspection(urn)
  return inspection ? [inspection] : []
}

// Bust the in-memory cache so the next request reloads from disk.
// Called by the weekly refresh job after a new ofsted.json is written.
function reload() {
  _data = null
}

module.exports = { getLatestInspection, getInspectionHistory, reload }
