'use client'

import { Trophy, Flame, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

export function Header() {
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    setIsLocalhost(
      window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('127.0.0.1')
    )
  }, [])
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-balance">ToF Character Gallery</h1>
              <p className="text-sm text-muted-foreground">Browse community character submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Flame className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-foreground">Rankings</span>
            </div>
            {isLocalhost && (
              <Link 
                href="/analytics" 
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-semibold text-blue-500">Analytics</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

