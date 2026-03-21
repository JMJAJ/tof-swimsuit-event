// Unified storage for analytics data
// Reads from git-committed files in analytics-data-v2/
// New snapshots are collected by GitHub Actions and committed to the repo

import { AnalyticsVersion } from './analytics-config'
import { readdir, readFile, existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const readdirAsync = promisify(readdir)
const readFileAsync = promisify(readFile)

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
  return join(process.cwd(), folder)
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
  
  const dir = getDataDir(version)
  if (!existsSync(dir)) return []
  
  try {
    const files = await readdirAsync(dir)
    const snapshotFiles = files
      .filter(isSnapshotFileName)
      .sort()
      .slice(-limit)
    
    const snapshots: StoredSnapshot[] = []
    for (const file of snapshotFiles) {
      try {
        const content = await readFileAsync(join(dir, file), 'utf-8')
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
  } catch {
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
