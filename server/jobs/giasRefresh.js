'use strict'

const path = require('path')
const fs   = require('fs')
const { spawn } = require('child_process')
const cron = require('node-cron')
const { reload } = require('../services/giasService')

const DATA_PATH   = path.join(__dirname, '../../data/schools.json')
const SCRIPT_PATH = path.join(__dirname, '../scripts/download-gias.js')

// Weekly: Monday at 03:00 AM (staggered from Ofsted which runs Sunday)
const SCHEDULE = '0 3 * * 1'

function runDownload() {
  return new Promise((resolve, reject) => {
    console.log('[gias] Starting weekly refresh…')
    const child = spawn(process.execPath, [SCRIPT_PATH], { stdio: 'inherit' })
    child.on('close', code => {
      if (code === 0) {
        reload()
        console.log('[gias] Refresh complete — cache cleared, new data will load on next request')
        resolve()
      } else {
        console.error(`[gias] Refresh failed (exit code ${code})`)
        reject(new Error(`download-gias exited with code ${code}`))
      }
    })
    child.on('error', reject)
  })
}

function scheduleGiasRefresh() {
  // Auto-download on startup if the full data file is missing (seed data is not enough)
  if (!fs.existsSync(DATA_PATH)) {
    console.log('[gias] schools.json not found — running initial download…')
    runDownload().catch(err => console.error('[gias] Initial download error:', err.message))
  }

  // Schedule weekly refresh
  cron.schedule(SCHEDULE, () => {
    runDownload().catch(err => console.error('[gias] Scheduled refresh error:', err.message))
  })

  console.log(`[gias] Weekly refresh scheduled (${SCHEDULE})`)
}

module.exports = { scheduleGiasRefresh }
