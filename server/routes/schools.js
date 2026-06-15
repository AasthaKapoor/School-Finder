const express = require('express')
const router = express.Router()
const { searchByLocation, getByUrn } = require('../services/giasService')
const { getLatestInspection } = require('../services/ofstedService')

function enrichWithOfsted(school) {
  return { ...school, ofsted: getLatestInspection(school.urn) }
}

router.get('/', (req, res) => {
  const { lat, lng, radius = '3' } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)
  const radiusNum = parseFloat(radius)

  if ([latNum, lngNum, radiusNum].some(Number.isNaN)) {
    return res.status(400).json({ error: 'lat, lng and radius must be numbers' })
  }

  const schools = searchByLocation(latNum, lngNum, radiusNum).map(enrichWithOfsted)
  res.json(schools)
})

router.get('/:urn', (req, res) => {
  const school = getByUrn(req.params.urn)
  if (!school) return res.status(404).json({ error: 'School not found' })
  res.json(enrichWithOfsted(school))
})

module.exports = router
