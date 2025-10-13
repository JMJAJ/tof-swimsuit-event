/**
 * Simple user search with automatic index updates
 */

interface UserIndex {
  name_to_uids: Record<string, string[]>
  uid_to_name: Record<string, string>
  stats: {
    total_entries: number
    unique_names: number
    unique_uids: number
    last_updated: number
    pages_fetched?: number
  }
}

let userIndex: UserIndex | null = null
let runtimeIndex: UserIndex | null = null

/**
 * Load the user index from fast API endpoint
 */
export async function loadUserIndex(): Promise<UserIndex> {
  // Return runtime index if available (includes new entries)
  if (runtimeIndex) return runtimeIndex

  // Load from API endpoint (much faster than static file)
  if (!userIndex) {
    try {
      const response = await fetch('/api/user-index')
      if (response.ok) {
        userIndex = await response.json()
        if (userIndex) {
          console.log(`Loaded user index: ${userIndex.stats.unique_names} names, ${userIndex.stats.pages_fetched || 0} pages`)
        }
      }
    } catch (error) {
      console.warn('User index API not available:', error)
    }
  }

  // Initialize runtime index from API data
  runtimeIndex = userIndex ? { 
    name_to_uids: { ...userIndex.name_to_uids },
    uid_to_name: { ...userIndex.uid_to_name },
    stats: { ...userIndex.stats }
  } : {
    name_to_uids: {},
    uid_to_name: {},
    stats: { total_entries: 0, unique_names: 0, unique_uids: 0, last_updated: 0 }
  }

  return runtimeIndex
}

/**
 * Search for UIDs by name (substring matching)
 */
export async function searchUsersByName(query: string): Promise<Array<{ name: string; uid: string }>> {
  if (!query.trim()) return []

  const index = await loadUserIndex()
  const queryLower = query.toLowerCase().trim()
  const results: Array<{ name: string; uid: string; priority: number }> = []

  // Search through all names (substring matching)
  for (const [name, uids] of Object.entries(index.name_to_uids)) {
    const nameIndex = name.indexOf(queryLower)
    if (nameIndex !== -1) {
      // Add all UIDs for this name
      for (const uid of uids) {
        const actualName = index.uid_to_name[uid] || name
        
        // Priority: exact match > starts with > contains
        let priority = 2 // contains
        if (name === queryLower) priority = 0 // exact match
        else if (nameIndex === 0) priority = 1 // starts with
        
        results.push({ name: actualName, uid, priority })
      }
    }
  }

  // Sort by relevance (priority first, then by name length)
  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.name.length - b.name.length
  })

  // Return top 10 results without priority field
  return results.slice(0, 10).map(({ name, uid }) => ({ name, uid }))
}

/**
 * Get name by UID
 */
export async function getNameByUid(uid: string): Promise<string | null> {
  const index = await loadUserIndex()
  return index.uid_to_name[uid] || null
}

/**
 * Get all UIDs for a name
 */
export async function getUidsByName(name: string): Promise<string[]> {
  const index = await loadUserIndex()
  const nameLower = name.toLowerCase().trim()
  return index.name_to_uids[nameLower] || []
}

/**
 * Update runtime index with new entries from API responses
 */
export async function learnFromApiResponse(works: any[]) {
  if (typeof window === 'undefined') return // SSR safety
  
  const index = await loadUserIndex()
  let hasNewEntries = false
  
  for (const work of works) {
    const uid = work.htUid?.trim()
    const name = work.roleName?.trim()
    
    if (uid && name && !index.uid_to_name[uid]) {
      const nameLower = name.toLowerCase()
      
      // Add to name mapping
      if (!index.name_to_uids[nameLower]) {
        index.name_to_uids[nameLower] = []
      }
      if (!index.name_to_uids[nameLower].includes(uid)) {
        index.name_to_uids[nameLower].push(uid)
      }
      
      // Add to UID mapping
      index.uid_to_name[uid] = name
      hasNewEntries = true
    }
  }
  
  if (hasNewEntries) {
    // Update stats
    index.stats.unique_uids = Object.keys(index.uid_to_name).length
    index.stats.unique_names = Object.keys(index.name_to_uids).length
    index.stats.last_updated = Date.now()
    
    // Update runtime index
    runtimeIndex = index
  }
}

/**
 * Get search suggestions as user types (substring matching)
 */
export async function getSearchSuggestions(query: string, limit: number = 8): Promise<string[]> {
  if (!query.trim() || query.length < 1) return []

  const index = await loadUserIndex()
  const queryLower = query.toLowerCase().trim()
  const suggestions: Array<{ name: string; priority: number }> = []

  for (const name of Object.keys(index.name_to_uids)) {
    const nameIndex = name.indexOf(queryLower)
    if (nameIndex !== -1) {
      // Get the actual display name
      const uids = index.name_to_uids[name]
      if (uids.length > 0) {
        const displayName = index.uid_to_name[uids[0]] || name
        
        // Avoid duplicates
        if (!suggestions.some(s => s.name === displayName)) {
          // Priority: exact match > starts with > contains
          let priority = 2 // contains
          if (name === queryLower) priority = 0 // exact match
          else if (nameIndex === 0) priority = 1 // starts with
          
          suggestions.push({ name: displayName, priority })
        }
      }
    }
  }

  // Sort by priority, then by name length
  suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.name.length - b.name.length
  })

  return suggestions.slice(0, limit).map(s => s.name)
}