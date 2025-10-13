'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Database, Users, Trophy, Server, Clock, Zap, Menu, Search, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { getServerRegion } from '@/lib/servers'

// Components
import { AnalyticsSidebar } from '@/components/analytics/analytics-sidebar'
import { OverviewCharts } from '@/components/analytics/overview-charts'
import { CreatorLeaderboard } from '@/components/analytics/creator-leaderboard'
import { TopRankingsTracker } from '@/components/analytics/top-rankings-tracker'
import { ContentTrends } from '@/components/analytics/content-trends'
import { ServerAnalyticsComponent } from '@/components/analytics/server-analytics'
import { UserComparison } from '@/components/analytics/user-comparison'
import { UserExplorer } from '@/components/analytics/user-explorer'

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
    worksByRegion: Record<string, number>
    topServers: Array<{ server: string; count: number }>
    responseTime: number
    cacheHitRate: number
    errorRate: number
    uniqueUsers: number
    searchQueries: string[]
    totalPages?: number
    totalRequests?: number
    successfulRequests?: number
    topUsers?: Array<{ user: string; count: number }>
    topTags?: Array<{ tag: string; count: number }>
    serverCount?: number
    regionCount?: number
    ticketRanges?: Array<{ range: string; count: number }>
    timeSlots?: Array<{ slot: string; count: number }>
    avgTicketsPerWork?: number
    allWorks?: PlayerWork[]
}

interface CreatorInsight {
    roleName: string
    serverName: string
    region: string
    totalWorks: number
    totalTickets: number
    avgTickets: number
    topWork: PlayerWork
    tags: string[]
    recentActivity: string
    growthTrend: 'rising' | 'stable' | 'declining'
    rank: number
}

interface ContentTrend {
    tag: string
    count: number
    avgTickets: number
    topWork: PlayerWork
    growth: number
    momentum: 'hot' | 'trending' | 'stable' | 'cooling'
}

interface ServerAnalytics {
    serverName: string
    region: string
    totalWorks: number
    uniqueCreators: number
    avgTicketsPerWork: number
    topCreator: string
    dominantTags: string[]
    activity: 'very_active' | 'active' | 'moderate' | 'quiet'
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsSnapshot[]>([])
    const [loading, setLoading] = useState(true)
    const [collecting, setCollecting] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

    // Processed analytics data
    const [creatorInsights, setCreatorInsights] = useState<CreatorInsight[]>([])
    const [contentTrends, setContentTrends] = useState<ContentTrend[]>([])
    const [serverAnalytics, setServerAnalytics] = useState<ServerAnalytics[]>([])

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [activeSection, setActiveSection] = useState('overview')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRegion, setSelectedRegion] = useState('all')
    const [showCount, setShowCount] = useState(50)

    // Explorer state
    const [explorerMode, setExplorerMode] = useState<{
        active: boolean
        type: 'tag' | 'server'
        value: string
    }>({ active: false, type: 'tag', value: '' })

    const fetchAnalytics = async (mode: 'full' | 'summary' | 'latest' = 'full') => {
        try {
            console.log(`Reading analytics data in ${mode} mode...`)

            // Use smart loading based on what we need
            const params = new URLSearchParams({
                mode,
                includeWorks: 'true', // We need works for detailed analysis
                limit: '50' // Limit for summary mode
            })

            const response = await fetch(`/api/analytics/read?${params}`)
            if (response.ok) {
                const result = await response.json()
                console.log('Analytics data loaded:', result.data?.length || 0, 'snapshots', `(${result.meta?.mode} mode)`)
                const snapshots = result.data || []
                setData(snapshots)

                // Process the latest snapshot for insights
                if (snapshots.length > 0) {
                    const latest = snapshots[snapshots.length - 1]
                    processAnalyticsData(latest)
                }

                setLastUpdate(new Date())
            } else {
                console.error('Failed to read analytics data:', response.statusText)
                setData([])
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
            setData([])
        } finally {
            setLoading(false)
        }
    }

    const processAnalyticsData = (snapshot: AnalyticsSnapshot) => {
        if (!snapshot.allWorks || snapshot.allWorks.length === 0) return

        // Process creator insights
        const creatorData: Record<string, {
            works: PlayerWork[]
            totalTickets: number
            serverName: string
            region: string
        }> = {}

        snapshot.allWorks.forEach(work => {
            const key = work.roleName
            if (!creatorData[key]) {
                creatorData[key] = {
                    works: [],
                    totalTickets: 0,
                    serverName: work.serverName,
                    region: getServerRegion(work.serverName) // Use current server detection logic
                }
            }
            creatorData[key].works.push(work)
            creatorData[key].totalTickets += work.ticket
        })

        const creators: CreatorInsight[] = Object.entries(creatorData).map(([roleName, data]) => {
            const topWork = data.works.reduce((max, work) =>
                work.ticket > max.ticket ? work : max
            )
            const allTags = data.works.flatMap(w => w.tags || [])
            const uniqueTags = Array.from(new Set(allTags))

            return {
                roleName,
                serverName: data.serverName,
                region: data.region,
                totalWorks: data.works.length,
                totalTickets: data.totalTickets,
                avgTickets: Math.round(data.totalTickets / data.works.length),
                topWork,
                tags: uniqueTags,
                recentActivity: getRecentActivity(data.works),
                growthTrend: 'stable' as const,
                rank: 0
            }
        }).sort((a, b) => b.totalTickets - a.totalTickets)
            .map((creator, index) => ({ ...creator, rank: index + 1 }))

        setCreatorInsights(creators)

        // Process content trends
        const tagData: Record<string, PlayerWork[]> = {}
        snapshot.allWorks.forEach(work => {
            (work.tags || []).forEach(tag => {
                if (!tagData[tag]) tagData[tag] = []
                tagData[tag].push(work)
            })
        })

        const trends: ContentTrend[] = Object.entries(tagData).map(([tag, works]) => {
            const totalTickets = works.reduce((sum, w) => sum + w.ticket, 0)
            const topWork = works.reduce((max, work) =>
                work.ticket > max.ticket ? work : max
            )

            return {
                tag: getTagName(tag),
                count: works.length,
                avgTickets: Math.round(totalTickets / works.length),
                topWork,
                growth: 0,
                momentum: (works.length > 100 ? 'hot' : works.length > 50 ? 'trending' : 'stable') as 'hot' | 'trending' | 'stable' | 'cooling'
            }
        }).sort((a, b) => b.count - a.count)

        setContentTrends(trends)

        // Process server analytics
        const serverData: Record<string, PlayerWork[]> = {}
        snapshot.allWorks.forEach(work => {
            if (!serverData[work.serverName]) serverData[work.serverName] = []
            serverData[work.serverName].push(work)
        })

        const servers: ServerAnalytics[] = Object.entries(serverData).map(([serverName, works]) => {
            const uniqueCreators = new Set(works.map(w => w.roleName)).size
            const totalTickets = works.reduce((sum, w) => sum + w.ticket, 0)
            const topCreator = works.reduce((max, work) =>
                work.ticket > max.ticket ? work : max
            ).roleName

            const tagCounts: Record<string, number> = {}
            works.forEach(work => {
                (work.tags || []).forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1
                })
            })

            const dominantTags = Object.entries(tagCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([tag]) => getTagName(tag))

            return {
                serverName,
                region: getServerRegion(serverName), // Use current server detection logic
                totalWorks: works.length,
                uniqueCreators,
                avgTicketsPerWork: Math.round(totalTickets / works.length),
                topCreator,
                dominantTags,
                activity: (works.length > 50 ? 'very_active' :
                    works.length > 20 ? 'active' :
                        works.length > 5 ? 'moderate' : 'quiet') as 'very_active' | 'active' | 'moderate' | 'quiet'
            }
        }).sort((a, b) => b.totalWorks - a.totalWorks)

        setServerAnalytics(servers)
    }

    const getTagName = (tagId: string): string => {
        const tagMap: Record<string, string> = {
            '1': 'Sweet-Cool',
            '2': 'Soft Allure',
            '3': 'Dopamine',
            '4': 'Retro',
            '5': 'Mood Aesthetic',
            '6': 'Cosplay Makeup',
            '7': 'Vigorous',
            '8': 'Elegant',
            '9': 'Instant Crush'
        }
        return tagMap[tagId] || `Tag-${tagId}`
    }

    const getRecentActivity = (works: PlayerWork[]): string => {
        const latest = works.reduce((max, work) =>
            new Date(work.createtime) > new Date(max.createtime) ? work : max
        )
        const daysAgo = Math.floor((Date.now() - new Date(latest.createtime).getTime()) / (1000 * 60 * 60 * 24))
        return daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`
    }

    const refreshData = async () => {
        setCollecting(true)
        try {
            console.log('🔄 Refreshing analytics data...')

            // Force reload all analytics data from files
            await fetchAnalytics('full')

            // Also refresh the page data to ensure everything is up to date
            window.location.reload()

        } catch (error) {
            console.error('❌ Failed to refresh data:', error)
            // Fallback: just reload analytics data without page refresh
            await fetchAnalytics('full')
        } finally {
            setCollecting(false)
        }
    }

    useEffect(() => {
        // Start with summary data for fast initial load
        fetchAnalytics('summary')

        // Then load full data after a short delay
        const fullDataTimeout = setTimeout(() => {
            fetchAnalytics('full')
        }, 2000)

        // Set up periodic updates with summary data
        const interval = setInterval(() => fetchAnalytics('summary'), 5 * 60 * 1000)

        return () => {
            clearTimeout(fullDataTimeout)
            clearInterval(interval)
        }
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-gray-600 dark:text-gray-400">Loading analytics...</span>
                </div>
            </div>
        )
    }

    const latest = data[data.length - 1]

    const handleTagClick = (tag: string) => {
        setExplorerMode({ active: true, type: 'tag', value: tag })
        setActiveSection('explorer')
    }

    const handleServerClick = (serverName: string) => {
        setExplorerMode({ active: true, type: 'server', value: serverName })
        setActiveSection('explorer')
    }

    const handleExplorerBack = () => {
        setExplorerMode({ active: false, type: 'tag', value: '' })
        setActiveSection('overview')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <AnalyticsSidebar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                totalWorks={latest?.totalWorks}
                uniqueUsers={latest?.uniqueUsers}
                serverCount={latest?.serverCount}
            />

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
                {/* Top Header */}
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <Menu className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Analytics Dashboard
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Tower of Fantasy Community Insights
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {lastUpdate && (
                                <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {lastUpdate.toLocaleTimeString()}
                                </Badge>
                            )}
                            <Button onClick={refreshData} disabled={collecting} size="sm">
                                {collecting ? (
                                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Refresh Site
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="p-6">
                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                        <div className="space-y-6">
                            {/* Key Metrics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Works</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {latest?.totalWorks.toLocaleString() || '0'}
                                                </p>
                                                <div className="flex items-center mt-1">
                                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                                                    <span className="text-xs text-green-600">Live data</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <Database className="h-5 w-5 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Creators</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {latest?.uniqueUsers.toLocaleString() || '0'}
                                                </p>
                                                <div className="flex items-center mt-1">
                                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                                                    <span className="text-xs text-green-600">Growing</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                <Users className="h-5 w-5 text-green-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Votes</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {latest?.allWorks ? latest.allWorks.reduce((sum, work) => sum + work.ticket, 0).toLocaleString() : '0'}
                                                </p>
                                                <div className="flex items-center mt-1">
                                                    <Minus className="h-3 w-3 text-gray-500 mr-1" />
                                                    <span className="text-xs text-gray-600">All time</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                                <Trophy className="h-5 w-5 text-orange-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Servers</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {latest?.serverCount || '0'}
                                                </p>
                                                <div className="flex items-center mt-1">
                                                    <Minus className="h-3 w-3 text-gray-500 mr-1" />
                                                    <span className="text-xs text-gray-600">Stable</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                <Server className="h-5 w-5 text-purple-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts */}
                            <OverviewCharts data={data} latest={latest} />
                        </div>
                    )}

                    {/* Creators Section */}
                    {activeSection === 'creators' && (
                        <div className="space-y-6">
                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Search className="h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search creators..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64"
                                    />
                                </div>
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
                                <Select value={showCount.toString()} onValueChange={(v) => setShowCount(parseInt(v))}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="25">Top 25</SelectItem>
                                        <SelectItem value="50">Top 50</SelectItem>
                                        <SelectItem value="100">Top 100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <CreatorLeaderboard
                                creators={creatorInsights}
                                searchQuery={searchQuery}
                                selectedRegion={selectedRegion}
                                showCount={showCount}
                            />
                        </div>
                    )}

                    {/* Top Rankings Section */}
                    {activeSection === 'rankings' && (
                        <div className="space-y-6">
                            <TopRankingsTracker data={data} />
                        </div>
                    )}

                    {/* User Comparison Section */}
                    {activeSection === 'comparison' && (
                        <div className="space-y-6">
                            <UserComparison
                                data={data}
                            />
                        </div>
                    )}

                    {/* Content Section */}
                    {activeSection === 'content' && (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="flex items-center space-x-2">
                                <Search className="h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search content categories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64"
                                />
                            </div>

                            <ContentTrends
                                trends={contentTrends}
                                searchQuery={searchQuery}
                                onTagClick={handleTagClick}
                            />
                        </div>
                    )}

                    {/* Servers Section */}
                    {activeSection === 'servers' && (
                        <div className="space-y-6">
                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Search className="h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder="Search servers..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64"
                                    />
                                </div>
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
                                <Select value={showCount.toString()} onValueChange={(v) => setShowCount(parseInt(v))}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="25">Top 25</SelectItem>
                                        <SelectItem value="50">Top 50</SelectItem>
                                        <SelectItem value="100">Top 100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <ServerAnalyticsComponent
                                servers={serverAnalytics}
                                searchQuery={searchQuery}
                                selectedRegion={selectedRegion}
                                showCount={showCount}
                                onServerClick={handleServerClick}
                            />
                        </div>
                    )}

                    {/* Explorer Section */}
                    {activeSection === 'explorer' && explorerMode.active && (
                        <UserExplorer
                            data={data}
                            filterType={explorerMode.type}
                            filterValue={explorerMode.value}
                            onBack={handleExplorerBack}
                        />
                    )}



                    {/* Competition & Behavior Analysis */}
                    {activeSection === 'competition' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Competition & Behavior Analysis</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Vote Concentration */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Vote Concentration</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {latest?.allWorks && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Top 1% hold:</span>
                                                    <span className="font-semibold">
                                                        {(() => {
                                                            const sorted = [...latest.allWorks].sort((a, b) => b.ticket - a.ticket)
                                                            const top1Percent = Math.max(1, Math.ceil(sorted.length * 0.01))
                                                            const topVotes = sorted.slice(0, top1Percent).reduce((sum, work) => sum + work.ticket, 0)
                                                            const totalVotes = sorted.reduce((sum, work) => sum + work.ticket, 0)
                                                            return `${((topVotes / totalVotes) * 100).toFixed(1)}%`
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Top 10% hold:</span>
                                                    <span className="font-semibold">
                                                        {(() => {
                                                            const sorted = [...latest.allWorks].sort((a, b) => b.ticket - a.ticket)
                                                            const top10Percent = Math.max(1, Math.ceil(sorted.length * 0.1))
                                                            const topVotes = sorted.slice(0, top10Percent).reduce((sum, work) => sum + work.ticket, 0)
                                                            const totalVotes = sorted.reduce((sum, work) => sum + work.ticket, 0)
                                                            return `${((topVotes / totalVotes) * 100).toFixed(1)}%`
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">10K+ votes:</span>
                                                    <span className="font-semibold">
                                                        {latest.allWorks.filter(work => work.ticket >= 10000).length}
                                                        ({((latest.allWorks.filter(work => work.ticket >= 10000).length / latest.allWorks.length) * 100).toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Creator Commitment */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Creator Patterns</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {latest?.allWorks && (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const creatorWorkCounts = new Map<string, number>()
                                                    latest.allWorks.forEach(work => {
                                                        creatorWorkCounts.set(work.roleName, (creatorWorkCounts.get(work.roleName) || 0) + 1)
                                                    })

                                                    const singleWorkCreators = Array.from(creatorWorkCounts.values()).filter(count => count === 1).length
                                                    const multiWorkCreators = Array.from(creatorWorkCounts.values()).filter(count => count > 1).length
                                                    const prolificCreators = Array.from(creatorWorkCounts.values()).filter(count => count >= 5).length

                                                    return (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">One-time:</span>
                                                                <span className="font-semibold">
                                                                    {singleWorkCreators} ({((singleWorkCreators / creatorWorkCounts.size) * 100).toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Multi-work:</span>
                                                                <span className="font-semibold">
                                                                    {multiWorkCreators} ({((multiWorkCreators / creatorWorkCounts.size) * 100).toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Prolific (5+):</span>
                                                                <span className="font-semibold">
                                                                    {prolificCreators} ({((prolificCreators / creatorWorkCounts.size) * 100).toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Success Rate by Attempt */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Success by Attempt</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {latest?.allWorks && (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const creatorStats = new Map<string, { works: PlayerWork[], totalVotes: number }>()
                                                    latest.allWorks.forEach(work => {
                                                        if (!creatorStats.has(work.roleName)) {
                                                            creatorStats.set(work.roleName, { works: [], totalVotes: 0 })
                                                        }
                                                        const stats = creatorStats.get(work.roleName)!
                                                        stats.works.push(work)
                                                        stats.totalVotes += work.ticket
                                                    })

                                                    const firstTimeAvg = Array.from(creatorStats.values())
                                                        .filter(stats => stats.works.length === 1)
                                                        .reduce((sum, stats) => sum + stats.totalVotes, 0) /
                                                        Array.from(creatorStats.values()).filter(stats => stats.works.length === 1).length

                                                    const multiWorkAvg = Array.from(creatorStats.values())
                                                        .filter(stats => stats.works.length > 1)
                                                        .reduce((sum, stats) => sum + (stats.totalVotes / stats.works.length), 0) /
                                                        Array.from(creatorStats.values()).filter(stats => stats.works.length > 1).length

                                                    return (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">First-time avg:</span>
                                                                <span className="font-semibold">
                                                                    {Math.round(firstTimeAvg || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Veteran avg:</span>
                                                                <span className="font-semibold">
                                                                    {Math.round(multiWorkAvg || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Regional Competition */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Regional Competition Landscape</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {latest?.allWorks && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(latest.worksByRegion)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([region, count]) => {
                                                    const regionWorks = latest.allWorks!.filter(work => work.region === region)
                                                    const avgVotes = regionWorks.reduce((sum, work) => sum + work.ticket, 0) / regionWorks.length
                                                    const topWork = regionWorks.reduce((max, work) => work.ticket > max.ticket ? work : max, regionWorks[0])
                                                    const competitiveness = avgVotes > 1000 ? 'High' : avgVotes > 500 ? 'Medium' : 'Low'

                                                    return (
                                                        <div key={region} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="font-medium">{region}</h4>
                                                                <Badge variant={
                                                                    competitiveness === 'High' ? 'destructive' :
                                                                        competitiveness === 'Medium' ? 'default' : 'secondary'
                                                                }>
                                                                    {competitiveness}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                                <p>{count} works</p>
                                                                <p>Avg: {Math.round(avgVotes).toLocaleString()}</p>
                                                                <p>Top: {topWork?.ticket.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tag Strategy Analysis */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tag Strategy Insights</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {latest?.allWorks && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-medium mb-3">Popular Combinations</h4>
                                                <div className="space-y-2">
                                                    {(() => {
                                                        const tagCombos = new Map<string, { count: number, avgVotes: number }>()
                                                        latest.allWorks.forEach(work => {
                                                            if (work.tags && work.tags.length > 1) {
                                                                const sortedTags = work.tags.sort().map(getTagName).join(' + ')
                                                                if (!tagCombos.has(sortedTags)) {
                                                                    tagCombos.set(sortedTags, { count: 0, avgVotes: 0 })
                                                                }
                                                                const combo = tagCombos.get(sortedTags)!
                                                                combo.count++
                                                                combo.avgVotes = (combo.avgVotes * (combo.count - 1) + work.ticket) / combo.count
                                                            }
                                                        })

                                                        return Array.from(tagCombos.entries())
                                                            .sort((a, b) => b[1].count - a[1].count)
                                                            .slice(0, 5)
                                                            .map(([combo, stats]) => (
                                                                <div key={combo} className="flex justify-between items-center">
                                                                    <span className="text-sm font-medium">{combo}</span>
                                                                    <div className="text-right">
                                                                        <Badge variant="outline">{stats.count}</Badge>
                                                                        <p className="text-xs text-gray-500">{Math.round(stats.avgVotes).toLocaleString()} avg</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                    })()}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-medium mb-3">Single vs Multi-Tag Performance</h4>
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const singleTagWorks = latest.allWorks.filter(work => work.tags?.length === 1)
                                                        const multiTagWorks = latest.allWorks.filter(work => work.tags && work.tags.length > 1)

                                                        const singleTagAvg = singleTagWorks.reduce((sum, work) => sum + work.ticket, 0) / singleTagWorks.length
                                                        const multiTagAvg = multiTagWorks.reduce((sum, work) => sum + work.ticket, 0) / multiTagWorks.length

                                                        return (
                                                            <>
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">Single tag avg:</span>
                                                                    <span className="font-semibold">{Math.round(singleTagAvg || 0).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">Multi tag avg:</span>
                                                                    <span className="font-semibold">{Math.round(multiTagAvg || 0).toLocaleString()}</span>
                                                                </div>
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}



                    {/* Network Analysis */}
                    {activeSection === 'network' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cross-Server Network Analysis</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Server Influence */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Server Influence Score</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {latest?.allWorks && (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const serverStats = new Map<string, {
                                                        totalVotes: number
                                                        avgVotes: number
                                                        topWork: number
                                                        creators: number
                                                        works: number
                                                    }>()

                                                    latest.allWorks.forEach(work => {
                                                        if (!serverStats.has(work.serverName)) {
                                                            serverStats.set(work.serverName, {
                                                                totalVotes: 0,
                                                                avgVotes: 0,
                                                                topWork: 0,
                                                                creators: 0,
                                                                works: 0
                                                            })
                                                        }
                                                        const stats = serverStats.get(work.serverName)!
                                                        stats.totalVotes += work.ticket
                                                        stats.works += 1
                                                        stats.topWork = Math.max(stats.topWork, work.ticket)
                                                    })

                                                    // Calculate influence score (combination of total votes, avg votes, and top work)
                                                    const serverInfluence = Array.from(serverStats.entries())
                                                        .map(([server, stats]) => {
                                                            stats.avgVotes = stats.totalVotes / stats.works
                                                            const influenceScore = (stats.totalVotes * 0.4) + (stats.avgVotes * 0.4) + (stats.topWork * 0.2)
                                                            return { server, ...stats, influenceScore }
                                                        })
                                                        .sort((a, b) => b.influenceScore - a.influenceScore)
                                                        .slice(0, 10)

                                                    return serverInfluence.map((server, index) => (
                                                        <div key={server.server} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                            <div>
                                                                <p className="font-medium">#{index + 1} {server.server}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {server.works} works • Avg: {Math.round(server.avgVotes).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-semibold">{Math.round(server.influenceScore).toLocaleString()}</p>
                                                                <p className="text-xs text-gray-500">influence</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Cross-Regional Patterns */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Regional Performance Gaps</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {latest?.allWorks && (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const regionalStats = new Map<string, {
                                                        works: number
                                                        totalVotes: number
                                                        avgVotes: number
                                                        topWork: number
                                                    }>()

                                                    latest.allWorks.forEach(work => {
                                                        const region = work.region || 'Unknown'
                                                        if (!regionalStats.has(region)) {
                                                            regionalStats.set(region, {
                                                                works: 0,
                                                                totalVotes: 0,
                                                                avgVotes: 0,
                                                                topWork: 0
                                                            })
                                                        }
                                                        const stats = regionalStats.get(region)!
                                                        stats.works += 1
                                                        stats.totalVotes += work.ticket
                                                        stats.topWork = Math.max(stats.topWork, work.ticket)
                                                    })

                                                    const sortedRegions = Array.from(regionalStats.entries())
                                                        .map(([region, stats]) => ({
                                                            region,
                                                            ...stats,
                                                            avgVotes: stats.totalVotes / stats.works
                                                        }))
                                                        .sort((a, b) => b.avgVotes - a.avgVotes)

                                                    const topRegion = sortedRegions[0]

                                                    return sortedRegions.map((region) => {
                                                        const performanceGap = ((topRegion.avgVotes - region.avgVotes) / topRegion.avgVotes) * 100
                                                        return (
                                                            <div key={region.region} className="flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-medium">{region.region}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Avg: {Math.round(region.avgVotes).toLocaleString()} votes
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge variant={
                                                                        performanceGap === 0 ? 'default' :
                                                                            performanceGap < 20 ? 'secondary' :
                                                                                performanceGap < 50 ? 'outline' : 'destructive'
                                                                    }>
                                                                        {performanceGap === 0 ? 'Leader' : `-${performanceGap.toFixed(0)}%`}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Network Insights */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Network Insights</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {latest?.allWorks && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {(() => {
                                                const uniqueCreators = new Set(latest.allWorks.map(work => work.roleName)).size
                                                const uniqueServers = new Set(latest.allWorks.map(work => work.serverName)).size
                                                const crossServerCreators = new Set()
                                                const creatorServers = new Map<string, Set<string>>()

                                                latest.allWorks.forEach(work => {
                                                    if (!creatorServers.has(work.roleName)) {
                                                        creatorServers.set(work.roleName, new Set())
                                                    }
                                                    creatorServers.get(work.roleName)!.add(work.serverName)
                                                })

                                                creatorServers.forEach((servers, creator) => {
                                                    if (servers.size > 1) {
                                                        crossServerCreators.add(creator)
                                                    }
                                                })

                                                const avgWorksPerCreator = latest.allWorks.length / uniqueCreators
                                                const avgCreatorsPerServer = uniqueCreators / uniqueServers

                                                return (
                                                    <>
                                                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                            <p className="text-2xl font-bold text-blue-600">{uniqueCreators}</p>
                                                            <p className="text-sm text-gray-600">Unique Creators</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded">
                                                            <p className="text-2xl font-bold text-green-600">{uniqueServers}</p>
                                                            <p className="text-sm text-gray-600">Active Servers</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded">
                                                            <p className="text-2xl font-bold text-orange-600">{avgWorksPerCreator.toFixed(1)}</p>
                                                            <p className="text-sm text-gray-600">Avg Works/Creator</p>
                                                        </div>
                                                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded">
                                                            <p className="text-2xl font-bold text-purple-600">{avgCreatorsPerServer.toFixed(1)}</p>
                                                            <p className="text-sm text-gray-600">Avg Creators/Server</p>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Performance Section */}
                    {activeSection === 'performance' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Performance</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {latest?.responseTime ? `${(latest.responseTime / 1000).toFixed(1)}s` : '0s'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {latest?.successfulRequests && latest?.totalRequests
                                                    ? `${((latest.successfulRequests / latest.totalRequests) * 100).toFixed(1)}%`
                                                    : '100%'
                                                }
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {latest?.totalRequests?.toLocaleString() || '0'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}