#!/usr/bin/env node
/**
 * Analytics collection script for GitHub Actions
 * Collects data from the API and saves to analytics-data-v2/
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync, writeFileSync as writeSync } from 'fs'
import { join } from 'path'

const API_ENDPOINT = 'https://event.perfectworld.com/m/ht/xote'
const ACT_ID = 'ht_20250910'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://tof.perfectworld.com',
  'Referer': 'https://tof.perfectworld.com/',
}

// Server region mapping (simplified version)
const SERVER_REGIONS = {
  'WS-Asia-01': 'Unknown',
  'Eden': 'Asia-Pacific',
  'Fate': 'Asia-Pacific',
  'Sushi': 'Asia-Pacific',
  'Sakura': 'Asia-Pacific',
  'Nightfall': 'Asia-Pacific',
  'Solaris': 'Asia-Pacific',
  'Ruby': 'Asia-Pacific',
  'Aestral-Noa': 'Asia-Pacific',
  'Memory': 'Asia-Pacific',
  'Aeria': 'Asia-Pacific',
  'Alintheus': 'Asia-Pacific',
  'Nova': 'Asia-Pacific',
  'WS-Europe-01': 'Europe',
  'Astora': 'Europe',
  'Dyrnwyn': 'Europe',
  'Luna Azul': 'South America',
  'WS-America-01': 'North America',
  'Phantasia': 'Asia-Pacific',
  'Stardust': 'Southeast Asia',
  'Anomora': 'Europe',
  'Gomap': 'Asia-Pacific',
  'Celestialrise': 'Europe',
  'Mistilteinn': 'Southeast Asia',
  'Babel': 'Asia-Pacific',
  'Valhalla': 'Southeast Asia',
  'Sweetie': 'Asia-Pacific',
}

function getServerRegion(serverName) {
  return SERVER_REGIONS[serverName] || 'Unknown'
}

function getTagName(tagId) {
  const tagMap = {
    '1': 'Sweet-Cool', '2': 'Soft Allure', '3': 'Dopamine',
    '4': 'Retro', '5': 'Mood Aesthetic', '6': 'Cosplay Makeup',
    '7': 'Vigorous', '8': 'Elegant', '9': 'Instant Crush'
  }
  return tagMap[tagId] || `Tag-${tagId}`
}

function getTicketRange(ticket) {
  if (ticket >= 50000) return '50K+'
  if (ticket >= 20000) return '20K-50K'
  if (ticket >= 10000) return '10K-20K'
  if (ticket >= 5000) return '5K-10K'
  if (ticket >= 1000) return '1K-5K'
  return '<1K'
}

function getTimeSlot(hour) {
  if (hour >= 6 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 18) return 'Afternoon'
  if (hour >= 18 && hour < 24) return 'Evening'
  return 'Night'
}

async function collectSnapshot() {
  const startTime = Date.now()
  const worksByRegion = {}
  const serverCounts = {}
  const userActivity = {}
  const tagUsage = {}
  const ticketRanges = {}
  const timeSlots = {}
  const allWorks = []
  const seenWorkIds = new Set()
  let totalWorks = 0
  let totalRequests = 0
  let successfulRequests = 0
  let totalPages = 0

  // Initialize regions
  const regions = ['Asia-Pacific', 'North America', 'Europe', 'Korea', 'South America', 'Southeast Asia', 'Unknown']
  regions.forEach(r => worksByRegion[r] = 0)

  async function fetchAllPages(orderBy) {
    let page = 1
    let hasNext = true
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 5

    while (hasNext && page <= 500 && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const url = new URL(`${API_ENDPOINT}/workList`)
        url.searchParams.set('actId', ACT_ID)
        url.searchParams.set('loginType', 'onesdkAbroad')
        url.searchParams.set('orderBy', orderBy)
        url.searchParams.set('favorOnly', '0')
        url.searchParams.set('tagIdList', '')
        url.searchParams.set('htuid', '')
        url.searchParams.set('workName', '')
        url.searchParams.set('pageNo', page.toString())

        const response = await fetch(url.toString(), {
          headers: HEADERS,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        totalRequests++

        if (response.ok) {
          successfulRequests++
          consecutiveFailures = 0
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
                const tags = work.tagList?.split(',').map(t => t.trim()) || []
                let imageUrls = []
                try {
                  if (work.image) imageUrls = JSON.parse(work.image).map(i => i.url)
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
                tags.forEach(t => t && (tagUsage[getTagName(t)] = (tagUsage[getTagName(t)] || 0) + 1))
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
        console.error(`Error on page ${page} (${consecutiveFailures} consecutive failures):`, error.message)
        page++
        await new Promise(r => setTimeout(r, 100))
      }
    }
  }

  console.log('Fetching pages by ticket...')
  await fetchAllPages('ticket')
  console.log('Fetching pages by id...')
  await fetchAllPages('id')

  const topServers = Object.entries(serverCounts).sort(([,a], [,b]) => b - a).slice(0, 20).map(([s, c]) => ({ server: s, count: c }))
  const topUsers = Object.entries(userActivity).sort(([,a], [,b]) => b - a).slice(0, 10).map(([u, c]) => ({ user: u, count: c }))
  const topTags = Object.entries(tagUsage).sort(([,a], [,b]) => b - a).slice(0, 15).map(([t, c]) => ({ tag: t, count: c }))

  const snapshot = {
    timestamp: Date.now(),
    version: 'v2',
    data: {
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
      allWorks,
      compressed: true,
    }
  }

  return snapshot
}

async function main() {
  console.log('Starting analytics collection...')
  
  const snapshot = await collectSnapshot()
  
  // Ensure directory exists
  const dataDir = join(process.cwd(), 'public', 'analytics-data-v2')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  
  // Save snapshot
  const filename = `snapshot-${snapshot.timestamp}.json`
  const filepath = join(dataDir, filename)
  writeFileSync(filepath, JSON.stringify(snapshot))
  console.log(`Saved snapshot: ${filename}`)
  
  // Update index
  const files = readdirSync(dataDir)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
    .sort()
  const indexFile = join(dataDir, 'index.json')
  writeFileSync(indexFile, JSON.stringify(files, null, 2))
  console.log(`Updated index with ${files.length} snapshots`)
  
  console.log(`Collection complete! ${snapshot.data.totalWorks} works collected.`)
}

main().catch(err => {
  console.error('Collection failed:', err)
  process.exit(1)
})
