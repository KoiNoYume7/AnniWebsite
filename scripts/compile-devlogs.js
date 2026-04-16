#!/usr/bin/env node
// ── compile-devlogs.js ──
// Reads content/devlogs/config.json + matching .md files,
// compiles them into client/src/data/devlogs.json.
// The frontend reads this compiled JSON at runtime.
//
// Usage:  node scripts/compile-devlogs.js
//         npm run compile-devlogs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const CONFIG_PATH  = path.join(ROOT, 'content', 'devlogs', 'config.json')
const DEVLOGS_DIR  = path.join(ROOT, 'content', 'devlogs')
const OUTPUT_PATH  = path.join(ROOT, 'client', 'src', 'data', 'devlogs.json')

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  const posts = []

  for (const entry of config) {
    if (!entry.published) {
      console.log(`  Skipping "${entry.slug}" (unpublished)`)
      continue
    }

    const mdPath = path.join(DEVLOGS_DIR, `${entry.slug}.md`)
    if (!fs.existsSync(mdPath)) {
      console.warn(`  WARNING: No markdown file for "${entry.slug}" at ${mdPath}`)
      continue
    }

    const content = fs.readFileSync(mdPath, 'utf8').trim()

    // Extract excerpt: first paragraph of content (strip markdown headers)
    const lines = content.split('\n').filter(l => !l.startsWith('#') && l.trim())
    const excerpt = lines.slice(0, 3).join(' ').substring(0, 200).trim()

    posts.push({
      slug:     entry.slug,
      title:    entry.title,
      subtitle: entry.subtitle || null,
      date:     entry.date,
      tags:     entry.tags || [],
      excerpt:  excerpt + (excerpt.length >= 200 ? '...' : ''),
      content:  content,
    })
  }

  // Sort by sort_order from config (config is already ordered, but be explicit)
  const configOrder = new Map(config.map((e, i) => [e.slug, e.sort_order ?? i]))
  posts.sort((a, b) => {
    const oa = configOrder.get(a.slug) ?? 999
    const ob = configOrder.get(b.slug) ?? 999
    if (oa !== ob) return oa - ob
    return new Date(b.date) - new Date(a.date)
  })

  // Write output
  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(posts, null, 2) + '\n')
  console.log(`Compiled ${posts.length} devlogs to ${path.relative(ROOT, OUTPUT_PATH)}`)
}

main()
