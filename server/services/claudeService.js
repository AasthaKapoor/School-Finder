// TODO: call Anthropic Claude API to summarise school profiles
const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function summariseSchool(schoolData) {
  throw new Error('claudeService.summariseSchool not implemented')
}

module.exports = { summariseSchool }
