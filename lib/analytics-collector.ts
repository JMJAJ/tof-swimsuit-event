/**
 * Background analytics collector for localhost development
 * Automatically collects data every 30 minutes
 */

class AnalyticsCollector {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private isCollecting = false
  private readonly COLLECTION_INTERVAL = 15 * 60 * 1000 // 15 minutes for comprehensive data

  start() {
    if (this.isRunning) {
      console.log('[Analytics] Collector already running')
      return
    }

    // Only run on localhost
    if (typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
      console.log('[Analytics] Collector disabled - not on localhost')
      return
    }

    console.log('[Analytics] Starting comprehensive background collector (15min intervals)')
    this.isRunning = true

    // Don't collect immediately on start - wait for first interval
    // This prevents issues during app initialization
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.collectData()
    }, this.COLLECTION_INTERVAL)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('[Analytics] Background collector stopped')
  }

  private async collectData() {
    // Prevent concurrent collections
    if (this.isCollecting) {
      console.log('[Analytics] Collection already in progress, skipping...')
      return
    }

    this.isCollecting = true
    
    try {
      console.log('[Analytics] Collecting data snapshot...')
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds
      
      const response = await fetch('/api/analytics/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const result = await response.json()
        console.log(`[Analytics] Snapshot collected successfully. Total snapshots: ${result.totalSnapshots}`)
      } else {
        const errorText = await response.text()
        console.error('[Analytics] Failed to collect snapshot:', response.status, errorText)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Analytics] Collection timed out after 30 seconds')
      } else {
        console.error('[Analytics] Error collecting data:', error)
      }
    } finally {
      this.isCollecting = false
    }
  }

  async collectNow() {
    return await this.collectData()
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isCollecting: this.isCollecting,
      intervalMinutes: this.COLLECTION_INTERVAL / (60 * 1000),
      nextCollection: this.intervalId ? new Date(Date.now() + this.COLLECTION_INTERVAL) : null
    }
  }
}

// Singleton instance
export const analyticsCollector = new AnalyticsCollector()