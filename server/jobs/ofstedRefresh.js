'use strict'

const path = require('path')
const fs   = require('fs')
const { spawn } = require('child_process')
const cron = require('node-cron')
const { reload } = require('../services/ofstedService')

const DATA_PATH   = path.join(__dirname, '../../data/ofsted.json')
const SCRIPT_PATH = path.join(__dirname, '../scripts/download-ofsted.js')

// Weekly: Sunday at 03:00 AM
const SCHEDULE = '0 3 * * 0'

function runDownload() {
  return new Promise((resolve, reject) => {
    console.log('[ofsted] Starting weekly refresh…')
    const child = spawn(process.execPath, [SCRIPT_PATH], { stdio: 'inherit' })
    child.on('close', code => {
      if (code === 0) {
        reload()
        console.log('[ofsted] Refresh complete — cache cleared, new data will load on next request')
        resolve()
      } else {
        console.error(`[ofsted] Refresh failed (exit code ${code})`)
        reject(new Error(`download-ofsted exited with code ${code}`))
      }
    })
    child.on('error', reject)
  })
}

function printManualInstructions() {
  console.log(`
[ofsted] ── Manual download required ──────────────────────────────────────────
  1. Open: https://www.gov.uk/government/statistics/monthly-management-information-ofsteds-school-inspections-outcomes
  2. Download the latest "Management information – schools" CSV file
  3. Save it to:  data/ofsted.csv   (project root, next to data/schools.json)
  4. Restart the server — Ofsted ratings will load automatically
─────────────────────────────────────────────────────────────────────────────`)
}

function scheduleOfstedRefresh() {
  if (!fs.existsSync(DATA_PATH)) {
    // Attempt auto-download but don't block startup on failure
    runDownload().catch(() => printManualInstructions())
  }

  cron.schedule(SCHEDULE, () => {
    runDownload().catch(err => console.error('[ofsted] Scheduled refresh error:', err.message))
  })

  console.log(`[ofsted] Weekly refresh scheduled (${SCHEDULE})`)
}

module.exports = { scheduleOfstedRefresh }
