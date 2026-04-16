#!/usr/bin/env node
// ── compile-all.js ──
// Runs all content compilers in sequence.
// Usage: node scripts/compile-all.js

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const scripts = [
  'scripts/fetch-repos.js',
  'scripts/compile-devlogs.js',
  'scripts/compile-about.js',
]

for (const script of scripts) {
  console.log(`\n── Running ${script} ──`)
  try {
    execSync(`node ${script}`, { cwd: ROOT, stdio: 'inherit' })
  } catch (err) {
    console.error(`Failed: ${script}`)
    process.exit(1)
  }
}

console.log('\n✅ All content compiled successfully.\n')
