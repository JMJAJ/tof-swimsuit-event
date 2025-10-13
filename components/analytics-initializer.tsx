'use client'

import { useEffect } from 'react'

export function AnalyticsInitializer() {
  useEffect(() => {
    // Only run on localhost
    if (typeof window !== 'undefined' && 
        (window.location.hostname.includes('localhost') || 
         window.location.hostname.includes('127.0.0.1'))) {
      
      // Dynamic import to avoid SSR issues
      import('@/lib/analytics-collector').then(({ analyticsCollector }) => {
        // Start collector after a short delay
        setTimeout(() => {
          analyticsCollector.start()
        }, 2000)
      })
    }
  }, [])

  return null // This component doesn't render anything
}