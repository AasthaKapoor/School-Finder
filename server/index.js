require('dotenv').config({ path: '../.env' })
const express = require('express')
const cors = require('cors')

const { scheduleGiasRefresh } = require('./jobs/giasRefresh')
const { scheduleOfstedRefresh } = require('./jobs/ofstedRefresh')
const schoolsRouter = require('./routes/schools')
const ofstedRouter = require('./routes/ofsted')
const performanceRouter = require('./routes/performance')
const summariseRouter = require('./routes/summarise')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/schools', schoolsRouter)
app.use('/api/ofsted', ofstedRouter)
app.use('/api/performance', performanceRouter)
app.use('/api/summarise', summariseRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  scheduleGiasRefresh()
  scheduleOfstedRefresh()
})
