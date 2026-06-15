const express = require('express')
const router = express.Router()

// TODO: implement performance data routes
router.get('/', (req, res) => {
  res.json({ message: 'performance route' })
})

module.exports = router
