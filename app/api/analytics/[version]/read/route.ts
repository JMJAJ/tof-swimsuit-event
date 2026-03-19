import { NextRequest, NextResponse } from "next/server"
import { ANALYTICS_VERSIONS, AnalyticsVersion } from "@/lib/analytics-config"
import { loadSnapshots, loadLatestSnapshot, getCache } from "@/lib/analytics-storage"
import { existsSync } from "fs"
import { readFile } from "fs/promises"
import path from "path"

const V1_ANALYTICS_DIR = path.join(process.cwd(), 'analytics-data')
const V1_INDEX_FILE = path.join(V1_ANALYTICS_DIR, 'index.json')
const ONE_HOUR_MS = 60 * 60 * 1000

let v2RefreshPromise: Promise<void> | null = null

function hasSnapshotData(snapshot: any): snapshot is { timestamp: number; data: any } {
  return Boolean(snapshot && typeof snapshot === 'object' && typeof snapshot.timestamp === 'number' && snapshot.data)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params
  const versionKey = version as AnalyticsVersion
  const config = ANALYTICS_VERSIONS[versionKey]
  
  if (!config) {
    return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'full'
  const limit = parseInt(searchParams.get('limit') || '50')
  const includeWorks = searchParams.get('includeWorks') === 'true'

  console.log(`📥 GET ${versionKey} analytics (mode: ${mode})`)

  try {
    if (versionKey === 'v1') {
      const legacyData = await readLegacyV1Data(mode, limit, includeWorks)
      return NextResponse.json({
        data: legacyData,
        meta: {
          mode,
          version,
          source: 'analytics-data',
          total: legacyData.length,
        }
      })
    }

    // Skip auto-refresh on Vercel - rely on external cron (cron-job.org or GitHub Actions)
    // Auto-refresh causes timeouts since collect takes 60+ seconds
    if (process.env.VERCEL !== '1') {
      await ensureFreshV2Snapshot(request)
    }

    if (mode === 'latest') {
      const snapshot = await loadLatestSnapshot(versionKey)
      
      if (!snapshot) {
        return NextResponse.json({ data: [] })
      }

      if (!includeWorks && snapshot.data.allWorks) {
        snapshot.data = {
          ...snapshot.data,
          allWorks: snapshot.data.allWorks.slice(0, 500),
        }
      }

      return NextResponse.json({ data: [snapshot.data] })
    }

    const snapshots = (await loadSnapshots(versionKey, { limit, useCache: false }))
      .filter(hasSnapshotData)
    
    const data = snapshots.map(s => {
      if (mode === 'summary') {
        return {
          timestamp: s.timestamp,
          totalWorks: s.data.totalWorks,
          worksByRegion: s.data.worksByRegion,
          topServers: s.data.topServers?.slice(0, 10),
          uniqueUsers: s.data.uniqueUsers,
          serverCount: s.data.serverCount,
          allWorks: includeWorks ? s.data.allWorks : undefined
        }
      }
      
      if (!includeWorks && s.data.allWorks?.length > 500) {
        return {
          ...s.data,
          allWorks: [...s.data.allWorks].sort((a: any, b: any) => b.ticket - a.ticket).slice(0, 500),
        }
      }
      return s.data
    })

    return NextResponse.json({
      data,
      meta: { mode, version, total: data.length }
    })
  } catch (error) {
    console.error(`Read error (${versionKey}):`, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function readLegacyV1Data(mode: string, limit: number, includeWorks: boolean) {
  if (!existsSync(V1_INDEX_FILE)) {
    return []
  }

  const indexContent = await readFile(V1_INDEX_FILE, 'utf-8')
  const index: string[] = JSON.parse(indexContent)

  if (mode === 'latest') {
    const latestFile = index[index.length - 1]
    if (!latestFile) return []

    const filePath = path.join(V1_ANALYTICS_DIR, latestFile)
    if (!existsSync(filePath)) return []

    const fileContent = await readFile(filePath, 'utf-8')
    const snapshot = JSON.parse(fileContent)

    if (!includeWorks && snapshot.allWorks) {
      snapshot.allWorks = snapshot.allWorks.slice(0, 500)
    }

    return [snapshot]
  }

  const filesToRead = mode === 'summary' ? index.slice(-limit) : index
  const data: any[] = []

  for (const filename of filesToRead) {
    const filePath = path.join(V1_ANALYTICS_DIR, filename)
    if (!existsSync(filePath)) continue

    try {
      const fileContent = await readFile(filePath, 'utf-8')
      const snapshot = JSON.parse(fileContent)

      if (mode === 'summary') {
        data.push({
          timestamp: snapshot.timestamp,
          totalWorks: snapshot.totalWorks,
          worksByRegion: snapshot.worksByRegion,
          topServers: snapshot.topServers?.slice(0, 10),
          responseTime: snapshot.responseTime,
          cacheHitRate: snapshot.cacheHitRate,
          errorRate: snapshot.errorRate,
          uniqueUsers: snapshot.uniqueUsers,
          serverCount: snapshot.serverCount,
          regionCount: snapshot.regionCount,
          avgTicketsPerWork: snapshot.avgTicketsPerWork,
          allWorks: includeWorks ? snapshot.allWorks : undefined,
        })
      } else {
        if (!includeWorks && snapshot.allWorks && snapshot.allWorks.length > 500) {
          snapshot.allWorks = snapshot.allWorks
            .sort((a: any, b: any) => b.ticket - a.ticket)
            .slice(0, 500)
        }
        data.push(snapshot)
      }
    } catch (error) {
      console.error(`Legacy read error for ${filename}:`, error)
    }
  }

  data.sort((a, b) => a.timestamp - b.timestamp)
  return data
}

async function ensureFreshV2Snapshot(request: NextRequest) {
  const latest = await loadLatestSnapshot('v2')
  const isStale = !latest || (Date.now() - latest.timestamp) >= ONE_HOUR_MS

  if (!isStale) {
    return
  }

  if (!v2RefreshPromise) {
    v2RefreshPromise = (async () => {
      await triggerV2Collect(request, 'v2-read-hourly-refresh')
      getCache().clear()
    })().finally(() => {
      v2RefreshPromise = null
    })
  }

  await v2RefreshPromise

  // Hard fallback: if still no snapshot after refresh, take one manual retry now.
  const latestAfterRefresh = await loadLatestSnapshot('v2')
  if (!latestAfterRefresh) {
    await triggerV2Collect(request, 'v2-read-manual-fallback')
    getCache().clear()
  }
}

async function triggerV2Collect(request: NextRequest, triggerSource: string) {
  const collectUrl = new URL('/api/analytics/v2/collect', request.url)
  const response = await fetch(collectUrl, {
    method: 'POST',
    headers: {
      'x-trigger-source': triggerSource,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`V2 refresh failed: ${response.status} ${message}`)
  }
}
