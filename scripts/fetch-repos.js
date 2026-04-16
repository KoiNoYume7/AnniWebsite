#!/usr/bin/env node
// ── fetch-repos.js ──
// Fetches all public repos from GitHub for KoiNoYume7 and merges them
// with the manual overrides in content/projects.json.
// Outputs client/src/data/projects.json — the file the frontend reads.
//
// Usage:  node scripts/fetch-repos.js
//         npm run fetch-repos        (if added to package.json)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const CONFIG_PATH   = path.join(ROOT, 'content', 'projects.json')
const OUTPUT_PATH   = path.join(ROOT, 'client', 'src', 'data', 'projects.json')
const GITHUB_USER   = 'KoiNoYume7'
const GITHUB_API    = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`

async function main() {
  // 1. Read manual config
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  const configMap = new Map(config.map(p => [p.name, p]))

  // 2. Fetch from GitHub
  let repos = []
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AnniWebsite-FetchRepos/1.0',
      },
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
    repos = await res.json()
    console.log(`Fetched ${repos.length} repos from GitHub`)
  } catch (err) {
    console.error('Failed to fetch from GitHub:', err.message)
    console.log('Falling back to config-only mode')
  }

  // 3. Merge: config overrides take priority, GitHub fills in the rest
  const merged = []

  // First add all repos that exist in config (preserves sort_order)
  for (const cfg of config) {
    const ghRepo = repos.find(r => r.name === cfg.name)
    merged.push({
      name:           cfg.name,
      icon:           cfg.icon || '📦',
      description:    cfg.description || ghRepo?.description || 'No description.',
      tags:           cfg.tags || ghRepo?.topics || [],
      phase:          cfg.phase || null,
      status:         cfg.status || 'wip',
      featured:       cfg.featured ?? false,
      sort_order:     cfg.sort_order ?? 999,
      url:            cfg.url_override || ghRepo?.html_url || `https://github.com/${GITHUB_USER}/${cfg.name}`,
      language:       ghRepo?.language || null,
      stars:          ghRepo?.stargazers_count ?? 0,
      forks:          ghRepo?.forks_count ?? 0,
      updated_at:     ghRepo?.updated_at || new Date().toISOString(),
      github_topics:  ghRepo?.topics || [],
    })
  }

  // Then add GitHub repos not in config
  for (const repo of repos) {
    if (configMap.has(repo.name)) continue
    if (repo.fork) continue // skip forks by default
    merged.push({
      name:           repo.name,
      icon:           '📦',
      description:    repo.description || 'No description.',
      tags:           repo.topics || [],
      phase:          null,
      status:         'unknown',
      featured:       false,
      sort_order:     999,
      url:            repo.html_url,
      language:       repo.language,
      stars:          repo.stargazers_count,
      forks:          repo.forks_count,
      updated_at:     repo.updated_at,
      github_topics:  repo.topics || [],
    })
  }

  // 4. Sort: by sort_order first, then by updated_at
  merged.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(b.updated_at) - new Date(a.updated_at)
  })

  // 5. Write output
  const outDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2) + '\n')
  console.log(`Wrote ${merged.length} projects to ${path.relative(ROOT, OUTPUT_PATH)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
