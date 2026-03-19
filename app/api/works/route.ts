import { type NextRequest, NextResponse } from "next/server"

const V2_WORKLIST_URL = "https://event.perfectworld.com/m/ht/xote/workList"

// Enhanced cache with learning capabilities
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60000 // 60 seconds - longer cache
const pendingRequests = new Map<string, Promise<any>>() // Request deduplication

// Track recent searches to learn new names
const recentSearches = new Map<string, number>()

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams
  const pageNo = searchParams.get("pageNo") || "1"
  const orderBy = searchParams.get("orderBy") || "ticket"
  const tagIdList = searchParams.get("tagIdList") || ""
  const workName = searchParams.get("workName") || ""
  const htuid = searchParams.get("htuid") || ""

  // Create cache key
  const cacheKey = `${pageNo}-${orderBy}-${tagIdList}-${workName}-${htuid}`
  const cached = cache.get(cacheKey)

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  }

  // Check if there's already a pending request for this key
  const pendingRequest = pendingRequests.get(cacheKey)
  if (pendingRequest) {
    try {
      const data = await pendingRequest
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    } catch (error) {
      // If pending request fails, continue with new request
    }
  }

  // Create and store the request promise for deduplication
  const requestPromise = (async () => {
    try {
      const apiUrl = new URL(V2_WORKLIST_URL)
      apiUrl.searchParams.set("actId", "ht_20250910")
      apiUrl.searchParams.set("loginType", "onesdkAbroad")
      apiUrl.searchParams.set("orderBy", orderBy)
      apiUrl.searchParams.set("favorOnly", "0")
      apiUrl.searchParams.set("tagIdList", tagIdList)
      apiUrl.searchParams.set("htuid", htuid)
      apiUrl.searchParams.set("workName", workName)
      apiUrl.searchParams.set("pageNo", pageNo)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // Reduced timeout

      const response = await fetch(apiUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Origin": "https://tof.perfectworld.com",
          "Referer": "https://tof.perfectworld.com/",
          "Connection": "keep-alive", // Enable connection reuse
        },
        signal: controller.signal,
        keepalive: true, // Keep connection alive
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()

      // Transform the API response to match our expected format
      if (data.success && data.result) {
        const transformedData = {
          list: data.result.workList || [],
          hasNext: Boolean(data.result.hasNext)
        }

        // Cache the result
        cache.set(cacheKey, { data: transformedData, timestamp: Date.now() })

        // Clean old cache entries (keep only last 200)
        if (cache.size > 200) {
          const entries = Array.from(cache.entries())
          entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
          cache.clear()
          entries.slice(0, 100).forEach(([key, value]) => cache.set(key, value))
        }

        return transformedData
      } else {
        throw new Error(`API returned error: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      throw error
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey)
    }
  })()

  // Store the promise for deduplication
  pendingRequests.set(cacheKey, requestPromise)

  try {
    const transformedData = await requestPromise
    const responseTime = Date.now() - startTime
    console.log(`[API] Works request completed in ${responseTime}ms (page ${pageNo})`)

    return NextResponse.json(transformedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Response-Time': `${responseTime}ms`,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching works:", error)

    // Return cached data if available, even if stale
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
        },
      })
    }

    return NextResponse.json(
      { error: "Failed to fetch works", list: [], hasNext: false },
      { status: 500 }
    )
  }
}
