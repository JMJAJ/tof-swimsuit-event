'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Trophy, Users, Clock, Eye, EyeOff, Shuffle } from 'lucide-react'

interface PlayerWork {
  id: number
  favorStatus: number
  status: number
  createtime: string
  htUid: string
  roleName: string
  serverName: string
  name: string
  image: string
  tagList: string
  ticket: number
  region?: string
  tags?: string[]
  imageUrls?: string[]
  collectedAt: number
}

interface AnalyticsSnapshot {
  timestamp: number
  totalWorks: number
  allWorks?: PlayerWork[]
}

interface PlayerRankingData {
  roleName: string
  serverName: string
  region: string
  color: string
  visible: boolean
  rankingHistory: Array<{
    timestamp: number
    rank: number | null // null if not in top rankings
    tickets: number
  }>
}

interface TopRankingsTrackerProps {
  data: AnalyticsSnapshot[]
}

export function TopRankingsTracker({ data }: TopRankingsTrackerProps) {
  const [selectedRanking, setSelectedRanking] = useState<'top50' | 'top100'>('top100')
  const [selectedRegion, setSelectedRegion] = useState('all')

  const [visiblePlayers, setVisiblePlayers] = useState<Set<string>>(new Set())
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null)
  const [showOnlyMovement, setShowOnlyMovement] = useState(false)

  // Use all available data
  const filteredData = useMemo(() => {
    return data
  }, [data])

  // Process ranking timeline data
  const { playerRankings, timelineData, allPlayers } = useMemo(() => {
    if (filteredData.length === 0) return { playerRankings: [], timelineData: [], allPlayers: [] }

    const rankingSize = selectedRanking === 'top50' ? 50 : 100
    const playerMap = new Map<string, PlayerRankingData>()
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
      '#14B8A6', '#F43F5E', '#8B5A2B', '#059669', '#DC2626',
      '#7C3AED', '#DB2777', '#0891B2', '#65A30D', '#EA580C',
      '#1E40AF', '#B91C1C', '#047857', '#D97706', '#7C2D12',
      '#BE185D', '#0E7490', '#4D7C0F', '#C2410C', '#4338CA',
      '#0F766E', '#BE123C', '#92400E', '#15803D', '#991B1B',
      '#6B21A8', '#A21CAF', '#0369A1', '#166534', '#C2410C',
      '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
      '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#111827',
      '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
      '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#111827',
      '#7F1D1D', '#7C2D12', '#78350F', '#365314', '#14532D',
      '#0F3460', '#581C87', '#86198F', '#9D174D', '#B45309',
      '#C2410C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5',
      '#FDE68A', '#FEF3C7', '#D1FAE5', '#A7F3D0', '#6EE7B7',
      '#34D399', '#10B981', '#059669', '#047857', '#065F46',
      '#0C4A6E', '#075985', '#0284C7', '#0EA5E9', '#38BDF8',
      '#7DD3FC', '#BAE6FD', '#E0F2FE', '#F0F9FF', '#1E1B4B',
      '#312E81', '#3730A3', '#4338CA', '#4F46E5', '#6366F1'
    ]
    let colorIndex = 0

    // Process each snapshot to build ranking history
    filteredData.forEach((snapshot, snapIndex) => {
      if (!snapshot.allWorks) return

      // Get top players for this snapshot
      const topPlayers = snapshot.allWorks
        .filter(work => selectedRegion === 'all' || work.region === selectedRegion)
        .sort((a, b) => b.ticket - a.ticket)
        .slice(0, rankingSize)

      // Update each player's ranking history
      topPlayers.forEach((work, rank) => {
        const playerKey = `${work.roleName}|${work.serverName}`
        
        if (!playerMap.has(playerKey)) {
          playerMap.set(playerKey, {
            roleName: work.roleName,
            serverName: work.serverName,
            region: work.region || 'Unknown',
            color: colors[colorIndex % colors.length],
            visible: false,
            rankingHistory: []
          })
          colorIndex++
        }

        const player = playerMap.get(playerKey)!
        player.rankingHistory.push({
          timestamp: snapshot.timestamp,
          rank: rank + 1,
          tickets: work.ticket
        })
      })

      // For players not in top rankings this snapshot, add null rank
      playerMap.forEach((player, key) => {
        const hasRankThisSnapshot = player.rankingHistory.some(h => h.timestamp === snapshot.timestamp)
        if (!hasRankThisSnapshot) {
          player.rankingHistory.push({
            timestamp: snapshot.timestamp,
            rank: null,
            tickets: 0
          })
        }
      })
    })

    // Sort ranking history by timestamp for each player
    playerMap.forEach(player => {
      player.rankingHistory.sort((a, b) => a.timestamp - b.timestamp)
    })

    const playerRankings = Array.from(playerMap.values())
    
    // Create timeline data for the chart
    const timelineData = filteredData.map(snapshot => {
      const date = new Date(snapshot.timestamp)
      const period = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
      
      const dataPoint: any = { 
        period, 
        timestamp: snapshot.timestamp,
        fullDate: date.toLocaleString()
      }
      
      playerRankings.forEach(player => {
        const rankData = player.rankingHistory.find(h => h.timestamp === snapshot.timestamp)
        dataPoint[`${player.roleName}|${player.serverName}`] = rankData?.rank || null
      })
      
      return dataPoint
    })

    // Get all unique players who appeared in rankings
    const allPlayers = playerRankings
      .filter(player => player.rankingHistory.some(h => h.rank !== null))
      .sort((a, b) => {
        // Sort by best rank achieved
        const aBestRank = Math.min(...a.rankingHistory.filter(h => h.rank !== null).map(h => h.rank!))
        const bBestRank = Math.min(...b.rankingHistory.filter(h => h.rank !== null).map(h => h.rank!))
        return aBestRank - bBestRank
      })

    return { playerRankings, timelineData, allPlayers }
  }, [filteredData, selectedRanking, selectedRegion])

  // Get summary statistics
  const summary = useMemo(() => {
    if (allPlayers.length === 0) return {
      totalPlayers: 0,
      activeNow: 0,
      biggestRiser: null as PlayerRankingData | null,
      biggestFaller: null as PlayerRankingData | null,
      mostStable: null as PlayerRankingData | null,
      avgMovement: 0
    }

    let biggestRise = 0
    let biggestFall = 0
    let biggestRiser: PlayerRankingData | null = null
    let biggestFaller: PlayerRankingData | null = null
    let mostStable: PlayerRankingData | null = null
    let minVariance = Infinity
    let totalMovement = 0
    let movementCount = 0

    allPlayers.forEach(player => {
      const validRanks = player.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!)
      if (validRanks.length < 2) return

      const firstRank = validRanks[0]
      const lastRank = validRanks[validRanks.length - 1]
      const rankChange = firstRank - lastRank // Positive = moved up (lower rank number)

      if (rankChange > biggestRise) {
        biggestRise = rankChange
        biggestRiser = player
      }

      if (rankChange < biggestFall) {
        biggestFall = rankChange
        biggestFaller = player
      }

      // Calculate variance for stability
      const mean = validRanks.reduce((sum: number, rank: number) => sum + rank, 0) / validRanks.length
      const variance = validRanks.reduce((sum: number, rank: number) => sum + Math.pow(rank - mean, 2), 0) / validRanks.length
      
      if (variance < minVariance) {
        minVariance = variance
        mostStable = player
      }

      // Track total movement
      for (let i = 1; i < validRanks.length; i++) {
        totalMovement += Math.abs(validRanks[i] - validRanks[i - 1])
        movementCount++
      }
    })

    const activeNow = allPlayers.filter(player => {
      const lastEntry = player.rankingHistory[player.rankingHistory.length - 1]
      return lastEntry?.rank !== null
    }).length

    return {
      totalPlayers: allPlayers.length,
      activeNow,
      biggestRiser,
      biggestFaller,
      mostStable,
      avgMovement: movementCount > 0 ? totalMovement / movementCount : 0
    }
  }, [allPlayers])

  // Handle player visibility
  const togglePlayerVisibility = (playerKey: string) => {
    const newVisible = new Set(visiblePlayers)
    if (newVisible.has(playerKey)) {
      newVisible.delete(playerKey)
    } else {
      newVisible.add(playerKey)
    }
    setVisiblePlayers(newVisible)
  }

  const showTopPlayers = (count: number) => {
    const topPlayers = allPlayers.slice(0, count).map(p => `${p.roleName}|${p.serverName}`)
    setVisiblePlayers(new Set(topPlayers))
  }

  const clearAllPlayers = () => {
    setVisiblePlayers(new Set())
  }

  const randomizePlayers = () => {
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5)
    const randomCount = Math.min(10, shuffled.length)
    const randomPlayers = shuffled.slice(0, randomCount).map(p => `${p.roleName}|${p.serverName}`)
    setVisiblePlayers(new Set(randomPlayers))
  }

  // Custom tooltip for the ranking chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload.filter((p: any) => p.value !== null)
      if (data.length === 0) return null

      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {data.map((entry: any, index: number) => {
            const [roleName, serverName] = entry.dataKey.split('|')
            return (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium">#{entry.value}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {roleName} ({serverName})
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  if (filteredData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Top Rankings Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Need at least 2 data points to track ranking changes</p>
            <p className="text-sm mt-1">Current snapshots: {filteredData.length}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={selectedRanking} onValueChange={(v) => setSelectedRanking(v as 'top50' | 'top100')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top50">Top 50</SelectItem>
            <SelectItem value="top100">Top 100</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="Asia-Pacific">Asia-Pacific</SelectItem>
            <SelectItem value="North America">North America</SelectItem>
            <SelectItem value="Europe">Europe</SelectItem>
            <SelectItem value="South America">South America</SelectItem>
            <SelectItem value="Southeast Asia">Southeast Asia</SelectItem>
            <SelectItem value="Korea">Korea</SelectItem>
            <SelectItem value="Unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>


      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Players</p>
                <p className="text-2xl font-bold text-blue-600">{summary.totalPlayers}</p>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Currently Active</p>
                <p className="text-2xl font-bold text-green-600">{summary.activeNow}</p>
              </div>
              <Trophy className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Visible Lines</p>
                <p className="text-2xl font-bold text-purple-600">{visiblePlayers.size}</p>
              </div>
              <Eye className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Movement</p>
                <p className="text-2xl font-bold text-orange-600">{summary.avgMovement.toFixed(1)}</p>
              </div>
              <Trophy className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Player Selection</span>
            <div className="flex items-center space-x-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => showTopPlayers(10)}>
                Top 10
              </Button>
              <Button variant="outline" size="sm" onClick={() => showTopPlayers(20)}>
                Top 20
              </Button>
              <Button variant="outline" size="sm" onClick={() => showTopPlayers(50)}>
                Top 50
              </Button>
              <Button variant="outline" size="sm" onClick={() => showTopPlayers(100)}>
                Top 100
              </Button>
              <Button variant="outline" size="sm" onClick={randomizePlayers}>
                <Shuffle className="h-4 w-4 mr-1" />
                Random
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllPlayers}>
                <EyeOff className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {allPlayers.map((player) => {
              const playerKey = `${player.roleName}|${player.serverName}`
              const isVisible = visiblePlayers.has(playerKey)
              const bestRank = Math.min(...player.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!))
              
              return (
                <button
                  key={playerKey}
                  onClick={() => togglePlayerVisibility(playerKey)}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    isVisible 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: player.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{player.roleName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {player.serverName} • Best: #{bestRank}
                      </p>
                    </div>
                  </div>
                  {isVisible && <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Big Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>{selectedRanking === 'top50' ? 'Top 50' : 'Top 100'} Rankings Timeline</span>
            </div>
            <Badge variant="outline">
              {visiblePlayers.size} players shown
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visiblePlayers.size === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Players Selected</h3>
              <p className="mb-4">Select players from the list above to see their ranking timeline</p>
              <Button onClick={() => showTopPlayers(50)}>Show Top 50 Players</Button>
            </div>
          ) : (
            <div className="w-full" style={{ height: '600px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    domain={[1, selectedRanking === 'top50' ? 50 : 100]}
                    reversed={true}
                    label={{ value: 'Rank', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Reference lines for key rankings */}
                  <ReferenceLine y={1} stroke="#FFD700" strokeDasharray="2 2" label="1st Place" />
                  <ReferenceLine y={10} stroke="#C0C0C0" strokeDasharray="2 2" label="Top 10" />
                  {selectedRanking === 'top100' && (
                    <ReferenceLine y={50} stroke="#CD7F32" strokeDasharray="2 2" label="Top 50" />
                  )}
                  
                  {Array.from(visiblePlayers).map((playerKey) => {
                    const player = allPlayers.find(p => `${p.roleName}|${p.serverName}` === playerKey)
                    if (!player) return null
                    
                    return (
                      <Line
                        key={playerKey}
                        type="monotone"
                        dataKey={playerKey}
                        stroke={player.color}
                        strokeWidth={highlightedPlayer === playerKey ? 4 : 2}
                        name={player.roleName}
                        connectNulls={false}
                        dot={{ r: 3, fill: player.color }}
                        activeDot={{ r: 5, fill: player.color }}
                        onMouseEnter={() => setHighlightedPlayer(playerKey)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notable Players */}
      {(summary.biggestRiser || summary.biggestFaller || summary.mostStable) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.biggestRiser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  <span>Biggest Riser</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{summary.biggestRiser.roleName}</p>
                  <p className="text-sm text-gray-600">{summary.biggestRiser.serverName} • {summary.biggestRiser.region}</p>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: summary.biggestRiser.color }}
                    />
                    <span className="text-sm">
                      Improved by {Math.max(...summary.biggestRiser.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!)) - 
                                   Math.min(...summary.biggestRiser.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!))} positions
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const key = `${summary.biggestRiser!.roleName}|${summary.biggestRiser!.serverName}`
                      setVisiblePlayers(new Set([key]))
                    }}
                  >
                    Show Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {summary.biggestFaller && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-red-500" />
                  <span>Biggest Faller</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{summary.biggestFaller.roleName}</p>
                  <p className="text-sm text-gray-600">{summary.biggestFaller.serverName} • {summary.biggestFaller.region}</p>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: summary.biggestFaller.color }}
                    />
                    <span className="text-sm">
                      Dropped by {Math.max(...summary.biggestFaller.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!)) - 
                                  Math.min(...summary.biggestFaller.rankingHistory.filter((h: any) => h.rank !== null).map((h: any) => h.rank!))} positions
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const key = `${summary.biggestFaller!.roleName}|${summary.biggestFaller!.serverName}`
                      setVisiblePlayers(new Set([key]))
                    }}
                  >
                    Show Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {summary.mostStable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  <span>Most Stable</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">{summary.mostStable.roleName}</p>
                  <p className="text-sm text-gray-600">{summary.mostStable.serverName} • {summary.mostStable.region}</p>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: summary.mostStable.color }}
                    />
                    <span className="text-sm">Consistent ranking performance</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const key = `${summary.mostStable!.roleName}|${summary.mostStable!.serverName}`
                      setVisiblePlayers(new Set([key]))
                    }}
                  >
                    Show Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}