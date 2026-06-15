const path = require('path')
const fs = require('fs')

const DATA_PATH = path.join(__dirname, '../../data/schools.json')
const SEED_PATH = path.join(__dirname, '../../data/schools-seed.json')

function toRad(deg) { return (deg * Math.PI) / 180 }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

let _schools = null

function loadSchools() {
  if (!_schools) {
    // Re-evaluate path each load so a freshly downloaded schools.json is picked up after reload()
    const schoolsPath = fs.existsSync(DATA_PATH) ? DATA_PATH : SEED_PATH
    _schools = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'))
    if (schoolsPath === DATA_PATH) {
      console.log(`[gias] Loaded ${_schools.length.toLocaleString()} schools from schools.json`)
    } else {
      console.log(`[gias] schools.json not found — using seed data (${_schools.length} schools). Run: npm run download-schools`)
    }
  }
  return _schools
}

function reload() {
  _schools = null
}

function searchByLocation(lat, lng, radiusMiles = 3) {
  return loadSchools()
    .map(s => ({ ...s, distanceMiles: haversine(lat, lng, s.lat, s.lng) }))
    .filter(s => s.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

function getByUrn(urn) {
  return loadSchools().find(s => s.urn === String(urn)) ?? null
}

module.exports = { searchByLocation, getByUrn, reload }
