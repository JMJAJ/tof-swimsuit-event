import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const ANALYTICS_DIR = path.join(process.cwd(), 'analytics-data')
const INDEX_FILE = path.join(ANALYTICS_DIR, 'index.json')

export async function GET(request: NextRequest) {
  console.log('📥 GET request received for analytics data')

  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'full' // 'full', 'summary', 'latest'
  const limit = parseInt(searchParams.get('limit') || '50')
  const includeWorks = searchParams.get('includeWorks') === 'true'

  // Allow production access
  const host = request.headers.get('host')
  const isProduction = host?.includes('vercel.app') || host?.includes('your-domain.com')
  const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1')
  
  if (!isProduction && !isLocalhost) {
    console.log('❌ Request rejected - not from allowed host:', host)
    return NextResponse.json({ error: 'Analytics not available' }, { status: 403 })
  }

  try {
    if (!existsSync(INDEX_FILE)) {
      return NextResponse.json({ data: [] })
    }

    const indexContent = await readFile(INDEX_FILE, 'utf-8')
    const index: string[] = JSON.parse(indexContent)

    if (mode === 'latest') {
      // Only return the latest snapshot
      const latestFile = index[index.length - 1]
      if (latestFile) {
        const filePath = path.join(ANALYTICS_DIR, latestFile)
        if (existsSync(filePath)) {
          const fileContent = await readFile(filePath, 'utf-8')
          const snapshot = JSON.parse(fileContent)
          
          // Optionally strip out heavy data
          if (!includeWorks && snapshot.allWorks) {
            snapshot.allWorks = snapshot.allWorks.slice(0, 100) // Keep only top 100 for preview
          }
          
          return NextResponse.json({ data: [snapshot] })
        }
      }
      return NextResponse.json({ data: [] })
    }

    const data: any[] = []
    const filesToRead = mode === 'summary' ? index.slice(-limit) : index

    // Read files with smart loading
    for (const filename of filesToRead) {
      const filePath = path.join(ANALYTICS_DIR, filename)
      if (existsSync(filePath)) {
        try {
          const fileContent = await readFile(filePath, 'utf-8')
          const snapshot = JSON.parse(fileContent)
          
          // For summary mode, strip heavy data
          if (mode === 'summary') {
            // Keep essential data but remove heavy arrays
            const lightSnapshot = {
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
              // Include only top 50 works for charts
              allWorks: includeWorks ? snapshot.allWorks?.slice(0, 50) : undefined
            }
            data.push(lightSnapshot)
          } else {
            // Full mode - include everything but with optional work limiting
            if (!includeWorks && snapshot.allWorks && snapshot.allWorks.length > 200) {
              // For very large datasets, limit to top 200 works to prevent memory issues
              snapshot.allWorks = snapshot.allWorks
                .sort((a: any, b: any) => b.ticket - a.ticket)
                .slice(0, 200)
            }
            data.push(snapshot)
          }
        } catch (error) {
          console.error(`Error reading snapshot ${filename}:`, error)
        }
      }
    }

    // Sort by timestamp
    data.sort((a, b) => a.timestamp - b.timestamp)

    console.log(`📊 Returning ${data.length} snapshots in ${mode} mode`)
    return NextResponse.json({ 
      data,
      meta: {
        mode,
        totalSnapshots: index.length,
        returnedSnapshots: data.length,
        includeWorks
      }
    })
  } catch (error) {
    console.error('Analytics read error:', error)
    return NextResponse.json({ error: 'Failed to read analytics' }, { status: 500 })
  }
}