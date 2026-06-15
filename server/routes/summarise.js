const express = require('express')
const router = express.Router()

// TODO: implement AI summarise route (calls claudeService)
router.post('/', (req, res) => {
  res.json({ message: 'summarise route' })
})

module.exports = router
