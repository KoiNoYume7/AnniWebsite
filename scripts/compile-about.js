#!/usr/bin/env node
// ── compile-about.js ──
// Copies content/about.json to client/src/data/about.json
// so the frontend can import it. If you later want to support
// markdown bio sections, extend this script to compile them.
//
// Usage:  node scripts/compile-about.js
//         npm run compile-about

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const INPUT_PATH  = path.join(ROOT, 'content', 'about.json')
const OUTPUT_PATH = path.join(ROOT, 'client', 'src', 'data', 'about.json')

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'))

  // Process markdown-style bold (**text**) in bio paragraphs → HTML <strong>
  if (data.bio) {
    data.bio = data.bio.map(p =>
      p.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent)">$1</strong>')
    )
  }

  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + '\n')
  console.log(`Compiled about data to ${path.relative(ROOT, OUTPUT_PATH)}`)
}

main()
