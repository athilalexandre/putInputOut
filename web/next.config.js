const fs = require('fs')
const path = require('path')

const legacyEnvPath = path.join(__dirname, 'env.local')
const nextEnvPath = path.join(__dirname, '.env.local')

if (!fs.existsSync(nextEnvPath) && fs.existsSync(legacyEnvPath)) {
  const envFile = fs.readFileSync(legacyEnvPath, 'utf8')

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const separator = trimmed.indexOf('=')
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
