// Request batching utility to reduce duplicate API calls
class RequestBatcher {
  private pendingRequests = new Map<string, Promise<any>>()
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly cacheTTL: number

  constructor(cacheTTL = 60000) { // 60 seconds default
    this.cacheTTL = cacheTTL
  }

  async fetch(url: string, options?: RequestInit): Promise<any> {
    // Check cache first
    const cached = this.cache.get(url)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(url)
    if (pending) {
      return pending
    }

    // Create new request
    const request = this.makeRequest(url, options)
    this.pendingRequests.set(url, request)

    try {
      const data = await request
      // Cache the result
      this.cache.set(url, { data, timestamp: Date.now() })
      return data
    } finally {
      // Remove from pending
      this.pendingRequests.delete(url)
    }
  }

  private async makeRequest(url: string, options?: RequestInit): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return response.json()
  }

  // Clear old cache entries
  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key)
      }
    }
  }
}

// Global instance
export const requestBatcher = new RequestBatcher()

// Cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => requestBatcher.cleanup(), 5 * 60 * 1000)
}