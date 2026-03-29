// Unified storage for analytics data
// Reads from git-committed files in analytics-data-v2/
// New snapshots are collected by GitHub Actions and committed to the repo

import { AnalyticsVersion } from './analytics-config'
import { readdir, readFile, existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readdirAsync = promisify(readdir)
const readFileAsync = promisify(readFile)

// GitHub raw content URL for Netlify (avoids bundling large files)
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/JMJAJ/tof-swimsuit-event/main'
const isNetlify = process.env.NETLIFY === 'true'

export interface StoredSnapshot {
  timestamp: number
  version: AnalyticsVersion
  data: any
  compressed?: boolean
}

function isSnapshotFileName(name: string): boolean {
  return /^snapshot-\d+\.json$/.test(name)
}

function isStoredSnapshot(value: any): value is StoredSnapshot {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.timestamp === 'number' &&
    typeof value.version === 'string' &&
    'data' in value
  )
}

// Get the data directory for a version
function getDataDir(version: AnalyticsVersion): string {
  const folder = version === 'v1' ? 'analytics-data' : `analytics-data-${version}`
  // Use public folder so it gets deployed to Vercel
  return join(process.cwd(), 'public', folder)
}

// Get GitHub raw URL for a file
function getGitHubRawUrl(version: AnalyticsVersion, filename: string): string {
  const folder = version === 'v1' ? 'analytics-data' : `analytics-data-${version}`
  return `${GITHUB_RAW_BASE}/public/${folder}/${filename}`
}

// Fetch file content (from GitHub raw on Netlify, local file otherwise)
async function fetchFileContent(version: AnalyticsVersion, filename: string): Promise<string | null> {
  if (isNetlify) {
    // Fetch from GitHub raw URL on Netlify
    const url = getGitHubRawUrl(version, filename)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.log(`GitHub raw error: ${response.status} for ${url}`)
        return null
      }
      return await response.text()
    } catch (error) {
      console.error('GitHub raw fetch error:', error)
      return null
    }
  } else {
    // Read from local file on Vercel/local
    const dir = getDataDir(version)
    const filepath = join(dir, filename)
    if (!existsSync(filepath)) return null
    return await readFileAsync(filepath, 'utf-8')
  }
}

// Get list of snapshot files
async function getSnapshotFiles(version: AnalyticsVersion): Promise<string[]> {
  if (isNetlify) {
    // Fetch index.json from GitHub
    const indexContent = await fetchFileContent(version, 'index.json')
    if (!indexContent) return []
    try {
      const files = JSON.parse(indexContent)
      return files.filter(isSnapshotFileName)
    } catch {
      return []
    }
  } else {
    // Read from local directory
    const dir = getDataDir(version)
    if (!existsSync(dir)) return []
    const files = await readdirAsync(dir)
    return files.filter(isSnapshotFileName).sort()
  }
}

// Memory cache for fast access
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private ttl = 60 * 60 * 1000 // 1 hour (matches cron interval)

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

const memoryCache = new MemoryCache()

export function getCache(): MemoryCache {
  return memoryCache
}

// Load snapshots from git-committed files
export async function loadSnapshots(
  version: AnalyticsVersion, 
  options: { limit?: number; useCache?: boolean } = {}
): Promise<StoredSnapshot[]> {
  const { limit = 50, useCache = true } = options
  
  // Check cache first
  if (useCache) {
    const cached = memoryCache.get(`${version}-snapshots`)
    if (cached) return cached
  }
  
  console.log(`Loading snapshots for version: ${version} (Netlify: ${isNetlify})`)
  
  try {
    const files = await getSnapshotFiles(version)
    console.log(`Found ${files.length} snapshot files`)
    
    const snapshotFiles = files.slice(-limit)
    
    const snapshots: StoredSnapshot[] = []
    for (const file of snapshotFiles) {
      try {
        const content = await fetchFileContent(version, file)
        if (!content) continue
        const snapshot = JSON.parse(content)
        if (isStoredSnapshot(snapshot)) {
          snapshots.push(snapshot)
        }
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by timestamp
    snapshots.sort((a, b) => a.timestamp - b.timestamp)
    
    // Update cache
    if (useCache) {
      memoryCache.set(`${version}-snapshots`, snapshots)
    }
    
    return snapshots
  } catch (error) {
    console.error('Error loading snapshots:', error)
    return []
  }
}

export async function loadLatestSnapshot(version: AnalyticsVersion): Promise<StoredSnapshot | null> {
  // Check cache first
  const cached = memoryCache.get(`${version}-latest`)
  if (cached) {
    return { timestamp: Date.now(), version, data: cached }
  }
  
  const snapshots = await loadSnapshots(version, { limit: 1, useCache: false })
  
  if (snapshots.length === 0) return null
  
  const latest = snapshots[snapshots.length - 1]
  
  // Update cache
  memoryCache.set(`${version}-latest`, latest.data)
  
  return latest
}

// Save snapshot (for local development / manual collection)
// In production, GitHub Actions commits directly to the repo
export async function saveSnapshot(version: AnalyticsVersion, data: any): Promise<string> {
  const { writeFileSync, mkdirSync } = require('fs')
  
  const dir = getDataDir(version)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  
  const snapshot: StoredSnapshot = {
    timestamp: Date.now(),
    version,
    data,
  }
  
  const id = `snapshot-${snapshot.timestamp}.json`
  const file = join(dir, id)
  writeFileSync(file, JSON.stringify(snapshot))
  
  // Update cache
  memoryCache.set(`${version}-latest`, data)
  memoryCache.clear() // Clear snapshots cache to force refresh
  
  return id
}
