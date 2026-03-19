import { NextRequest, NextResponse } from "next/server"
import { ANALYTICS_VERSIONS, AnalyticsVersion } from "@/lib/analytics-config"
import { saveSnapshot } from "@/lib/analytics-storage"
import { getServerRegion, SERVERS_DATA } from "@/lib/servers"

interface PlayerWork {
  id: number
  favorStatus: number
  status: number
  createtime: string
  htUid: string
  roleName: string
  serverName: string
  name: string
  image: string
  tagList: string
  ticket: number
  region?: string
  tags?: string[]
  imageUrls?: string[]
  collectedAt: number
}

interface AnalyticsSnapshot {
  timestamp: number
  totalWorks: number
  worksByRegion: Record<string, number>
  topServers: Array<{ server: string; count: number }>
  responseTime: number
  cacheHitRate: number
  errorRate: number
  uniqueUsers: number
  searchQueries: string[]
  totalPages: number
  totalRequests: number
  successfulRequests: number
  topUsers: Array<{ user: string; count: number }>
  topTags: Array<{ tag: string; count: number }>
  serverCount: number
  regionCount: number
  ticketRanges: Array<{ range: string; count: number }>
  timeSlots: Array<{ slot: string; count: number }>
  avgTicketsPerWork: number
  allWorks: PlayerWork[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const { version } = await params
  const versionKey = version as AnalyticsVersion
  const config = ANALYTICS_VERSIONS[versionKey]
  
  if (!config) {
    return NextResponse.json({ error: 'Invalid version' }, { status: 400 })
  }

  if (versionKey !== 'v2') {
    return NextResponse.json({
      error: 'Collection is only enabled for v2. Legacy/V1 reads from analytics-data JSON files.'
    }, { status: 403 })
  }

  console.log(`📥 POST request for ${versionKey} analytics collection`)

  const host = request.headers.get('host')
  const isAllowed = host?.includes('vercel.app') || 
                    host?.includes('localhost') || 
                    host?.includes('127.0.0.1')
  
  if (!isAllowed) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  console.log(`🚀 Starting ${versionKey} analytics collection...`)

  try {
    const snapshot = await collectAnalyticsSnapshot(config)
    
    // Save using unified storage
    const snapshotId = await saveSnapshot(versionKey, snapshot)
    
    console.log(`✅ ${versionKey} collection complete! Saved ${snapshot.allWorks.length} records`)

    return NextResponse.json({
      success: true,
      snapshot,
      snapshotId,
    })
  } catch (error) {
    console.error(`❌ ${versionKey} collection error:`, error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed',
    }, { status: 500 })
  }
}

async function collectAnalyticsSnapshot(config: {
  apiEndpoint: string
  actId: string
  headers: Record<string, string>
}): Promise<AnalyticsSnapshot> {
  const startTime = Date.now()
  const worksByRegion: Record<string, number> = {}
  const serverCounts: Record<string, number> = {}
  const userActivity: Record<string, number> = {}
  const tagUsage: Record<string, number> = {}
  const ticketRanges: Record<string, number> = {}
  const timeSlots: Record<string, number> = {}
  const allWorks: PlayerWork[] = []
  const seenWorkIds = new Set<number>()
  let totalWorks = 0
  let totalRequests = 0
  let successfulRequests = 0
  let totalPages = 0

  const getTagName = (tagId: string): string => {
    const tagMap: Record<string, string> = {
      '1': 'Sweet-Cool', '2': 'Soft Allure', '3': 'Dopamine',
      '4': 'Retro', '5': 'Mood Aesthetic', '6': 'Cosplay Makeup',
      '7': 'Vigorous', '8': 'Elegant', '9': 'Instant Crush'
    }
    return tagMap[tagId] || `Tag-${tagId}`
  }

  const getTicketRange = (ticket: number): string => {
    if (ticket >= 50000) return '50K+'
    if (ticket >= 20000) return '20K-50K'
    if (ticket >= 10000) return '10K-20K'
    if (ticket >= 5000) return '5K-10K'
    if (ticket >= 1000) return '1K-5K'
    return '<1K'
  }

  const getTimeSlot = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'Morning'
    if (hour >= 12 && hour < 18) return 'Afternoon'
    if (hour >= 18 && hour < 24) return 'Evening'
    return 'Night'
  }

  // Initialize regions
  Object.keys(SERVERS_DATA).forEach(r => worksByRegion[r] = 0)
  worksByRegion['Korea'] = 0
  worksByRegion['Unknown'] = 0

  const fetchAllPages = async (orderBy: string) => {
    let page = 1
    let hasNext = true
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 5

    while (hasNext && page <= 500 && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const url = new URL(`${config.apiEndpoint}/workList`)
        url.searchParams.set("actId", config.actId)
        url.searchParams.set("loginType", "onesdkAbroad")
        url.searchParams.set("orderBy", orderBy)
        url.searchParams.set("favorOnly", "0")
        url.searchParams.set("tagIdList", "")
        url.searchParams.set("htuid", "")
        url.searchParams.set("workName", "")
        url.searchParams.set("pageNo", page.toString())

        const response = await fetch(url.toString(), {
          headers: config.headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        totalRequests++

        if (response.ok) {
          successfulRequests++
          consecutiveFailures = 0 // Reset on success
          const data = await response.json()

          if (data.success && data.result) {
            const works = data.result.workList || []
            hasNext = Boolean(data.result.hasNext)

            if (works.length > 0) {
              totalPages++

              for (const work of works) {
                if (seenWorkIds.has(work.id)) continue
                seenWorkIds.add(work.id)
                totalWorks++

                const region = getServerRegion(work.serverName) || 'Unknown'
                const tags = work.tagList?.split(',').map((t: string) => t.trim()) || []
                let imageUrls: string[] = []
                try {
                  if (work.image) imageUrls = JSON.parse(work.image).map((i: any) => i.url)
                } catch {}

                allWorks.push({
                  id: work.id,
                  favorStatus: work.favorStatus,
                  status: work.status,
                  createtime: work.createtime,
                  htUid: work.htUid,
                  roleName: work.roleName,
                  serverName: work.serverName,
                  name: work.name,
                  image: work.image,
                  tagList: work.tagList,
                  ticket: work.ticket,
                  region,
                  tags,
                  imageUrls,
                  collectedAt: Date.now()
                })

                serverCounts[work.serverName] = (serverCounts[work.serverName] || 0) + 1
                if (worksByRegion[region] !== undefined) worksByRegion[region]++
                if (work.roleName) userActivity[work.roleName] = (userActivity[work.roleName] || 0) + 1
                tags.forEach((t: string) => t && (tagUsage[getTagName(t)] = (tagUsage[getTagName(t)] || 0) + 1))
                if (work.ticket) ticketRanges[getTicketRange(work.ticket)] = (ticketRanges[getTicketRange(work.ticket)] || 0) + 1
                if (work.createtime) timeSlots[getTimeSlot(new Date(work.createtime).getHours())] = (timeSlots[getTimeSlot(new Date(work.createtime).getHours())] || 0) + 1
              }
            }
          }
        }

        page++
        await new Promise(r => setTimeout(r, 25))
      } catch (error) {
        totalRequests++
        consecutiveFailures++
        console.error(`[V2 Collect] Error on page ${page} (${consecutiveFailures} consecutive failures):`, error instanceof Error ? error.message : error)
        page++
        await new Promise(r => setTimeout(r, 100)) // Longer delay after error
      }
    }
  }

  await fetchAllPages('ticket')
  await fetchAllPages('id')

  const topServers = Object.entries(serverCounts).sort(([,a], [,b]) => b - a).slice(0, 20).map(([s, c]) => ({ server: s, count: c }))
  const topUsers = Object.entries(userActivity).sort(([,a], [,b]) => b - a).slice(0, 10).map(([u, c]) => ({ user: u, count: c }))
  const topTags = Object.entries(tagUsage).sort(([,a], [,b]) => b - a).slice(0, 15).map(([t, c]) => ({ tag: t, count: c }))

  return {
    timestamp: Date.now(),
    totalWorks,
    worksByRegion,
    topServers,
    responseTime: Date.now() - startTime,
    cacheHitRate: 0.8,
    errorRate: totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0,
    uniqueUsers: Object.keys(userActivity).length,
    searchQueries: [],
    totalPages,
    totalRequests,
    successfulRequests,
    topUsers,
    topTags,
    serverCount: Object.keys(serverCounts).length,
    regionCount: Object.keys(worksByRegion).filter(r => worksByRegion[r] > 0).length,
    ticketRanges: Object.entries(ticketRanges).map(([r, c]) => ({ range: r, count: c })),
    timeSlots: Object.entries(timeSlots).map(([s, c]) => ({ slot: s, count: c })),
    avgTicketsPerWork: totalWorks > 0 ? allWorks.reduce((s, w) => s + w.ticket, 0) / totalWorks : 0,
    allWorks
  }
}
