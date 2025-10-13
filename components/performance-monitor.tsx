"use client"

import { useEffect, useState } from "react"

export function PerformanceMonitor() {
  const [stats, setStats] = useState({
    loadTime: 0,
    memoryUsage: 0,
    renderCount: 0,
  })

  useEffect(() => {
    let renderCount = 0
    
    const updateStats = () => {
      renderCount++
      
      setStats({
        loadTime: performance.now(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        renderCount,
      })
    }

    updateStats()
    
    const interval = setInterval(updateStats, 1000)
    return () => clearInterval(interval)
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50">
      <div>Load: {Math.round(stats.loadTime)}ms</div>
      <div>Memory: {Math.round(stats.memoryUsage / 1024 / 1024)}MB</div>
      <div>Renders: {stats.renderCount}</div>
    </div>
  )
}