"use client"

import { useState, useEffect, useRef } from "react"
import { Users, ImageIcon, Trophy, Globe, RefreshCw, Play, Pause } from "lucide-react"
import { getServerRegion, getAllRegions, getRegionAbbreviation } from "@/lib/servers"
import type { Work } from "@/lib/data"

interface UserIndexStats {
  total_entries: number
  unique_names: number
  unique_uids: number
  last_updated: number
  pages_fetched?: number
}

interface VoteStats {
  totalVotes: number
  regionVotes: Record<string, number>
  totalSubmissions: number
  regionSubmissions: Record<string, number>
}

export function StatsBar() {
  const [stats, setStats] = useState<UserIndexStats | null>(null)
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAllStats = async () => {
    setIsLoading(true)

    // Fetch user index stats
    try {
      const response = await fetch('/api/user-index')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.warn('Could not fetch user stats:', error)
    }

    // Fetch vote statistics by loading all works
    try {
      const voteData: VoteStats = {
        totalVotes: 0,
        regionVotes: {},
        totalSubmissions: 0,
        regionSubmissions: {}
      }

      const regions = getAllRegions()
      regions.forEach(region => {
        voteData.regionVotes[region] = 0
        voteData.regionSubmissions[region] = 0
      })

      // Fetch multiple pages to get comprehensive stats
      let page = 1
      let hasMore = true

      while (hasMore && page <= 1000) { // Fetch ALL pages for complete stats
        const response = await fetch(`/api/works?pageNo=${page}&orderBy=ticket&tagIdList=&workName=&htuid=`)
        if (response.ok) {
          const data = await response.json()
          const works: Work[] = data.list || []

          works.forEach(work => {
            const region = getServerRegion(work.serverName)
            const votes = work.ticket || 0

            voteData.totalVotes += votes
            voteData.totalSubmissions += 1

            if (region && region !== "Unknown") {
              voteData.regionVotes[region] = (voteData.regionVotes[region] || 0) + votes
              voteData.regionSubmissions[region] = (voteData.regionSubmissions[region] || 0) + 1
            }
          })

          hasMore = data.hasNext && works.length > 0
          page++
        } else {
          hasMore = false
        }
      }

      setVoteStats(voteData)
    } catch (error) {
      console.warn('Could not fetch vote stats:', error)
    }

    setIsLoading(false)
    setLastUpdated(new Date())
  }

  // Initial load
  useEffect(() => {
    fetchAllStats()
  }, [])

  // Auto-update effect
  useEffect(() => {
    if (autoUpdate) {
      // Update every 5 minutes (300,000 ms)
      intervalRef.current = setInterval(fetchAllStats, 300000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoUpdate])

  const handleManualRefresh = () => {
    fetchAllStats()
  }

  const toggleAutoUpdate = () => {
    setAutoUpdate(!autoUpdate)
  }

  if (isLoading) {
    return (
      <div className="bg-secondary/50 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading statistics...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary/50 border-b border-border">
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Main Stats */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Active Creators</span>
            <span className="text-lg font-bold text-foreground">
              {stats ? stats.unique_uids.toLocaleString() : '2,000+'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Submissions</span>
            <span className="text-lg font-bold text-foreground">
              {voteStats ? voteStats.totalSubmissions.toLocaleString() : (stats ? stats.total_entries.toLocaleString() : '2,400+')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Total Votes</span>
            <span className="text-lg font-bold text-foreground">
              {voteStats ? voteStats.totalVotes.toLocaleString() : '440,000+'}
            </span>
          </div>
        </div>

        {/* Regional Vote Stats */}
        {voteStats && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-center gap-1 mb-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Regional Vote Distribution (Sample from top submissions)</span>
            </div>
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {getAllRegions().map(region => {
                const votes = voteStats.regionVotes[region] || 0
                const submissions = voteStats.regionSubmissions[region] || 0
                const percentage = voteStats.totalVotes > 0 ? (votes / voteStats.totalVotes * 100) : 0

                return (
                  <div key={region} className="text-center">
                    <div className="text-xs text-muted-foreground font-medium">
                      {getRegionAbbreviation(region)}
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {votes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {submissions} submissions • {percentage.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}