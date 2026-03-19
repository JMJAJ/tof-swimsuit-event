import { NextResponse } from "next/server"

const V2_WORKLIST_URL = "https://event.perfectworld.com/m/ht/xote/workList"

// Cache the index for 5 minutes
let cachedIndex: any = null
let lastFetch = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface UserIndex {
  name_to_uids: Record<string, string[]>
  uid_to_name: Record<string, string>
  stats: {
    total_entries: number
    unique_names: number
    unique_uids: number
    last_updated: number
    pages_fetched: number
  }
}

async function fetchPage(pageNo: number): Promise<any> {
  const url = new URL(V2_WORKLIST_URL)
  url.searchParams.set("actId", "ht_20250910")
  url.searchParams.set("loginType", "onesdkAbroad")
  url.searchParams.set("orderBy", "id")
  url.searchParams.set("favorOnly", "0")
  url.searchParams.set("tagIdList", "")
  url.searchParams.set("htuid", "")
  url.searchParams.set("workName", "")
  url.searchParams.set("pageNo", pageNo.toString())

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://tof.perfectworld.com",
      "Referer": "https://tof.perfectworld.com/",
    },
    next: { revalidate: 300 } // Cache for 5 minutes
  })

  if (!response.ok) {
    throw new Error(`API responded with status: ${response.status}`)
  }

  return response.json()
}

async function buildUserIndex(): Promise<UserIndex> {
  console.log("🚀 Building fresh user index...")
  
  const nameToUids = new Map<string, Set<string>>()
  const uidToName = new Map<string, string>()
  let totalEntries = 0
  let pagesFetched = 0

  // Fetch pages in parallel batches for speed
  const BATCH_SIZE = 5
  let page = 1
  let hasMore = true

  while (hasMore) {
    const batchPromises = []
    
    // Create batch of parallel requests
    for (let i = 0; i < BATCH_SIZE && hasMore; i++) {
      batchPromises.push(fetchPage(page + i))
    }

    try {
      const batchResults = await Promise.all(batchPromises)
      
      for (let i = 0; i < batchResults.length; i++) {
        const data = batchResults[i]
        pagesFetched++
        
        if (!data.success || !data.result) {
          hasMore = false
          break
        }

        const workList = data.result.workList || []
        
        if (workList.length === 0) {
          hasMore = false
          break
        }

        // Process entries
        for (const work of workList) {
          const uid = work.htUid?.trim()
          const name = work.roleName?.trim()
          
          if (uid && name) {
            const nameLower = name.toLowerCase()
            
            // Add to name mapping
            if (!nameToUids.has(nameLower)) {
              nameToUids.set(nameLower, new Set())
            }
            nameToUids.get(nameLower)!.add(uid)
            
            // Add to UID mapping
            uidToName.set(uid, name)
            totalEntries++
          }
        }

        // Check if this was the last page
        if (!data.result.hasNext) {
          hasMore = false
          break
        }
      }

      page += BATCH_SIZE
      
      // Add small delay between batches to be nice to the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
    } catch (error) {
      console.error(`Error fetching batch starting at page ${page}:`, error)
      hasMore = false
    }
  }

  // Convert to final format
  const finalNameToUids: Record<string, string[]> = {}
  nameToUids.forEach((uids, name) => {
    finalNameToUids[name] = Array.from(uids)
  })

  const finalUidToName: Record<string, string> = {}
  uidToName.forEach((name, uid) => {
    finalUidToName[uid] = name
  })

  const index: UserIndex = {
    name_to_uids: finalNameToUids,
    uid_to_name: finalUidToName,
    stats: {
      total_entries: totalEntries,
      unique_names: nameToUids.size,
      unique_uids: uidToName.size,
      last_updated: Date.now(),
      pages_fetched: pagesFetched
    }
  }

  console.log(`✅ Built index: ${totalEntries} entries, ${nameToUids.size} names, ${pagesFetched} pages`)
  return index
}

export async function GET() {
  try {
    const now = Date.now()
    
    // Return cached index if still fresh
    if (cachedIndex && (now - lastFetch) < CACHE_DURATION) {
      return NextResponse.json(cachedIndex, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }

    // Build fresh index
    const index = await buildUserIndex()
    
    // Cache it
    cachedIndex = index
    lastFetch = now

    return NextResponse.json(index, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })

  } catch (error) {
    console.error("Error building user index:", error)
    
    // Return cached index if available, even if stale
    if (cachedIndex) {
      return NextResponse.json(cachedIndex, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }

    return NextResponse.json(
      { 
        error: "Failed to build user index",
        name_to_uids: {},
        uid_to_name: {},
        stats: { total_entries: 0, unique_names: 0, unique_uids: 0, last_updated: 0, pages_fetched: 0 }
      }, 
      { status: 500 }
    )
  }
}