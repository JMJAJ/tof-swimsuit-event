// Unified storage for analytics data
// Works locally with filesystem, on Vercel with Blob storage

import { AnalyticsVersion } from './analytics-config'

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

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'
const isDev = process.env.NODE_ENV === 'development'

// Storage interface
interface StorageAdapter {
  save(version: AnalyticsVersion, snapshot: StoredSnapshot): Promise<string>
  list(version: AnalyticsVersion, limit?: number): Promise<string[]>
  read(version: AnalyticsVersion, id: string): Promise<StoredSnapshot | null>
  delete(version: AnalyticsVersion, id: string): Promise<void>
}

// Local filesystem storage (development)
class LocalStorage implements StorageAdapter {
  private getDir(version: AnalyticsVersion): string {
    const { join } = require('path')
    // V1 uses existing analytics-data folder, V2 uses analytics-data-v2
    const folder = version === 'v1' ? 'analytics-data' : `analytics-data-${version}`
    return join(process.cwd(), folder)
  }

  async save(version: AnalyticsVersion, snapshot: StoredSnapshot): Promise<string> {
    const { writeFile, mkdir } = require('fs/promises')
    const { existsSync } = require('fs')
    const { join } = require('path')

    const dir = this.getDir(version)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    const id = `snapshot-${snapshot.timestamp}.json`
    const file = join(dir, id)
    
    // Compress data for storage
    const compressed = this.compress(snapshot)
    await writeFile(file, JSON.stringify(compressed))
    
    return id
  }

  async list(version: AnalyticsVersion, limit = 50): Promise<string[]> {
    const { readdir } = require('fs/promises')
    const { existsSync } = require('fs')
    
    const dir = this.getDir(version)
    if (!existsSync(dir)) return []

    const files = await readdir(dir)
    return files
      .filter((f: string) => isSnapshotFileName(f))
      .sort()
      .slice(-limit)
  }

  async read(version: AnalyticsVersion, id: string): Promise<StoredSnapshot | null> {
    const { readFile } = require('fs/promises')
    const { existsSync } = require('fs')
    const { join } = require('path')

    const file = join(this.getDir(version), id)
    if (!existsSync(file)) return null

    const content = await readFile(file, 'utf-8')
    return this.decompress(JSON.parse(content))
  }

  async delete(version: AnalyticsVersion, id: string): Promise<void> {
    const { unlink } = require('fs/promises')
    const { existsSync } = require('fs')
    const { join } = require('path')

    const file = join(this.getDir(version), id)
    if (existsSync(file)) {
      await unlink(file)
    }
  }

  private compress(snapshot: StoredSnapshot): any {
    // Remove redundant data, keep essentials
    const { data } = snapshot
    return {
      ...snapshot,
      data: {
        ...data,
        // Keep allWorks but mark as compressed
        allWorks: data.allWorks?.map((work: any) => ({
          id: work.id,
          htUid: work.htUid,
          roleName: work.roleName,
          serverName: work.serverName,
          name: work.name,
          tagList: work.tagList,
          ticket: work.ticket,
          createtime: work.createtime,
          region: work.region,
          tags: work.tags,
          imageUrls: work.imageUrls, // Keep all images
        })),
        compressed: true,
      }
    }
  }

  private decompress(snapshot: any): StoredSnapshot {
    return snapshot
  }
}

// Vercel Blob storage (production)
class VercelBlobStorage implements StorageAdapter {
  private getToken(): string {
    return process.env.BLOB_READ_WRITE_TOKEN || ''
  }

  private getPrefix(version: AnalyticsVersion): string {
    return `analytics-${version}`
  }

  async save(version: AnalyticsVersion, snapshot: StoredSnapshot): Promise<string> {
    const { put } = await import('@vercel/blob')
    
    const id = `snapshot-${snapshot.timestamp}.json`
    const key = `${this.getPrefix(version)}/${id}`
    
    // Compress data
    const compressed = {
      ...snapshot,
      data: {
        ...snapshot.data,
        allWorks: snapshot.data.allWorks?.map((work: any) => ({
          id: work.id,
          htUid: work.htUid,
          roleName: work.roleName,
          serverName: work.serverName,
          name: work.name,
          tagList: work.tagList,
          ticket: work.ticket,
          createtime: work.createtime,
          region: work.region,
          tags: work.tags,
          imageUrls: work.imageUrls, // Keep all images
        })),
        compressed: true,
      }
    }

    await put(key, JSON.stringify(compressed), {
      token: this.getToken(),
      access: 'public',
      allowOverwrite: true,
    })

    return id
  }

  async list(version: AnalyticsVersion, limit = 50): Promise<string[]> {
    const { list } = await import('@vercel/blob')
    
    const result = await list({
      token: this.getToken(),
      prefix: this.getPrefix(version),
    })

    return result.blobs
      .map(blob => blob.pathname.split('/').pop() || '')
      .filter(name => isSnapshotFileName(name))
      .sort()
      .slice(-limit)
  }

  async read(version: AnalyticsVersion, id: string): Promise<StoredSnapshot | null> {
    const { head } = await import('@vercel/blob')
    
    const key = `${this.getPrefix(version)}/${id}`
    
    try {
      const blob = await head(key, { token: this.getToken() })
      if (!blob) return null
      
      // Fetch the blob content via URL
      const response = await fetch(blob.url)
      const text = await response.text()
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  async delete(version: AnalyticsVersion, id: string): Promise<void> {
    const { del } = await import('@vercel/blob')
    
    const key = `${this.getPrefix(version)}/${id}`
    await del(key, {
      token: this.getToken(),
    })
  }
}

// Memory cache for fast access
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private ttl = 5 * 60 * 1000 // 5 minutes

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

// Export singleton storage
let storageInstance: StorageAdapter | null = null
const memoryCache = new MemoryCache()

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    if (isVercel && process.env.BLOB_READ_WRITE_TOKEN) {
      storageInstance = new VercelBlobStorage()
    } else {
      storageInstance = new LocalStorage()
    }
  }
  return storageInstance
}

export function getCache(): MemoryCache {
  return memoryCache
}

// Utility functions
export async function saveSnapshot(version: AnalyticsVersion, data: any): Promise<string> {
  const storage = getStorage()
  const snapshot: StoredSnapshot = {
    timestamp: Date.now(),
    version,
    data,
  }
  
  const id = await storage.save(version, snapshot)
  
  // Update cache
  memoryCache.set(`${version}-latest`, data)
  
  return id
}

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
  
  const storage = getStorage()
  const ids = await storage.list(version, limit)
  
  const snapshots: StoredSnapshot[] = []
  for (const id of ids) {
    const snapshot = await storage.read(version, id)
    if (isStoredSnapshot(snapshot)) snapshots.push(snapshot)
  }
  
  // Update cache
  if (useCache) {
    memoryCache.set(`${version}-snapshots`, snapshots)
  }
  
  return snapshots
}

export async function loadLatestSnapshot(version: AnalyticsVersion): Promise<StoredSnapshot | null> {
  // Check cache first
  const cached = memoryCache.get(`${version}-latest`)
  if (cached) {
    return { timestamp: Date.now(), version, data: cached }
  }
  
  const storage = getStorage()
  const ids = await storage.list(version, 1)
  
  if (ids.length === 0) return null
  
  const latestId = ids[ids.length - 1]
  const latest = await storage.read(version, latestId)
  return isStoredSnapshot(latest) ? latest : null
}
