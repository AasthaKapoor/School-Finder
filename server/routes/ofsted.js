const express = require('express')
const router = express.Router()

// TODO: implement Ofsted report routes
router.get('/', (req, res) => {
  res.json({ message: 'ofsted route' })
})

module.exports = router
