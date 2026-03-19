'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Database, Users, Trophy, Server, Clock, Menu, Search } from 'lucide-react'
import { getServerRegion } from '@/lib/servers'
import { AnalyticsVersion, ANALYTICS_VERSIONS } from '@/lib/analytics-config'
import { VersionBadge, VersionSwitcher } from './version-switcher'

// Import existing components
import { AnalyticsSidebar } from './analytics-sidebar'
import { OverviewCharts } from './overview-charts'
import { CreatorLeaderboard } from './creator-leaderboard'
import { TopRankingsTracker } from './top-rankings-tracker'
import { ContentTrends } from './content-trends'
import { ServerAnalyticsComponent } from './server-analytics'
import { UserComparison } from './user-comparison'
import { UserExplorer } from './user-explorer'

interface PlayerWork {
  id: number
  roleName: string
  serverName: string
  name: string
  ticket: number
  image?: string
  imageUrls?: string[]
  tagList?: string
  region?: string
  tags?: string[]
  createtime: string
}

interface AnalyticsSnapshot {
  timestamp: number
  totalWorks: number
  worksByRegion: Record<string, number>
  topServers: Array<{ server: string; count: number }>
  uniqueUsers: number
  serverCount?: number
  allWorks?: PlayerWork[]
  responseTime?: number
  successfulRequests?: number
  totalRequests?: number
}

interface SharedDashboardProps {
  version: AnalyticsVersion
}

export function SharedDashboard({ version }: SharedDashboardProps) {
  const config = ANALYTICS_VERSIONS[version]
  
  const [data, setData] = useState<AnalyticsSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [showCount, setShowCount] = useState(1000)
  const [creatorInsights, setCreatorInsights] = useState<any[]>([])
  const [contentTrends, setContentTrends] = useState<any[]>([])
  const [serverAnalytics, setServerAnalytics] = useState<any[]>([])
  const [explorerMode, setExplorerMode] = useState<{ active: boolean; type: 'tag' | 'server'; value: string }>({ active: false, type: 'tag', value: '' })

  const fetchData = async (mode: 'full' | 'summary' | 'latest' = 'summary') => {
    try {
      const params = new URLSearchParams({ mode, includeWorks: 'true', limit: '1000' })
      const res = await fetch(`/api/analytics/${version}/read?${params}`)
      
      if (res.ok) {
        const result = await res.json()
        setData(result.data || [])
        if (result.data?.length > 0) {
          processData(result.data[result.data.length - 1])
        }
        setLastUpdate(new Date())
      }
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  const processData = (snapshot: AnalyticsSnapshot | null | undefined) => {
    if (!snapshot?.allWorks?.length) return

    // Creator insights
    const creators: Record<string, any> = {}
    snapshot.allWorks.forEach(w => {
      if (!creators[w.roleName]) creators[w.roleName] = { works: [], tickets: 0, server: w.serverName, region: getServerRegion(w.serverName) }
      creators[w.roleName].works.push(w)
      creators[w.roleName].tickets += w.ticket
    })

    setCreatorInsights(Object.entries(creators)
      .map(([name, c]: [string, any]) => ({
        roleName: name,
        totalWorks: c.works.length,
        totalTickets: c.tickets,
        avgTickets: Math.round(c.tickets / c.works.length),
        topWork: c.works.reduce((max: any, w: any) => w.ticket > max.ticket ? w : max),
        serverName: c.server,
        region: c.region,
        tags: Array.from(new Set(c.works.flatMap((w: any) => w.tags || []))),
        rank: 0
      }))
      .sort((a, b) => b.totalTickets - a.totalTickets)
      .map((c, i) => ({ ...c, rank: i + 1 })))

    // Content trends
    const tags: Record<string, any[]> = {}
    snapshot.allWorks.forEach(w => (w.tags || []).forEach(t => { if (!tags[t]) tags[t] = []; tags[t].push(w) }))
    setContentTrends(Object.entries(tags).map(([tag, works]) => ({
      tag: getTagName(tag),
      count: works.length,
      avgTickets: Math.round(works.reduce((s, w) => s + w.ticket, 0) / works.length),
      topWork: works.reduce((max, w) => w.ticket > max.ticket ? w : max)
    })).sort((a, b) => b.count - a.count))

    // Server analytics
    const servers: Record<string, PlayerWork[]> = {}
    snapshot.allWorks.forEach(w => { if (!servers[w.serverName]) servers[w.serverName] = []; servers[w.serverName].push(w) })
    setServerAnalytics(Object.entries(servers).map(([name, works]) => {
      const tagCounts: Record<string, number> = {}
      works.forEach(w => {
        ;(w.tags || []).forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })

      const dominantTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => getTagName(tag))

      const totalWorks = works.length
      const activity =
        totalWorks >= 50 ? 'very_active' :
        totalWorks >= 25 ? 'active' :
        totalWorks >= 10 ? 'moderate' :
        'quiet'

      return {
        serverName: name,
        region: getServerRegion(name),
        totalWorks,
        uniqueCreators: new Set(works.map(w => w.roleName)).size,
        avgTicketsPerWork: Math.round(works.reduce((s, w) => s + w.ticket, 0) / works.length),
        topCreator: works.reduce((max, w) => w.ticket > max.ticket ? w : max).roleName,
        dominantTags,
        activity,
      }
    }).sort((a, b) => b.totalWorks - a.totalWorks))
  }

  const getTagName = (id: string) => ({ '1': 'Sweet-Cool', '2': 'Soft Allure', '3': 'Dopamine', '4': 'Retro', '5': 'Mood Aesthetic', '6': 'Cosplay Makeup', '7': 'Vigorous', '8': 'Elegant', '9': 'Instant Crush' }[id] || id)

  const refresh = async () => {
    setCollecting(true)
    await fetchData('full')
    setCollecting(false)
  }

  useEffect(() => {
    fetchData('summary')
    const t = setTimeout(() => fetchData('full'), 2000)
    const i = setInterval(() => fetchData('summary'), 5 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  }, [version])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span>Loading {config.name} analytics...</span>
      </div>
    )
  }

  const latest = data[data.length - 1]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AnalyticsSidebar activeSection={activeSection} setActiveSection={setActiveSection} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} totalWorks={latest?.totalWorks} uniqueUsers={latest?.uniqueUsers} serverCount={latest?.serverCount} />
      
      <div className={`transition-all ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-4 w-4" /></Button>
              <div>
                <h1 className="text-xl font-bold">Analytics - {config.name}</h1>
                <p className="text-sm text-gray-500">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <VersionSwitcher />
              <VersionBadge version={version} />
              {lastUpdate && <Badge variant="outline" className="h-8 rounded-md px-3 text-xs font-medium"><Clock className="h-3 w-3 mr-1" />{lastUpdate.toLocaleTimeString()}</Badge>}
              <Button onClick={refresh} disabled={collecting} size="sm">
                <RefreshCw className={`h-3 w-3 mr-1 ${collecting ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Works', value: latest?.totalWorks?.toLocaleString() || '0', icon: Database, color: 'blue' },
                  { label: 'Active Creators', value: latest?.uniqueUsers?.toLocaleString() || '0', icon: Users, color: 'green' },
                  { label: 'Total Votes', value: latest?.allWorks?.reduce((s, w) => s + w.ticket, 0).toLocaleString() || '0', icon: Trophy, color: 'orange' },
                  { label: 'Active Servers', value: latest?.serverCount || '0', icon: Server, color: 'purple' }
                ].map(m => (
                  <Card key={m.label}>
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{m.label}</p>
                          <p className="text-2xl font-bold">{m.value}</p>
                        </div>
                        <div className={`p-2 bg-${m.color}-50 rounded-lg`}>
                          <m.icon className={`h-5 w-5 text-${m.color}-600`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <OverviewCharts data={data as any} latest={latest as any} />
            </div>
          )}

          {activeSection === 'creators' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><Search className="h-4 w-4" /><Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" /></div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All Regions" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Regions</SelectItem><SelectItem value="Asia-Pacific">Asia-Pacific</SelectItem><SelectItem value="North America">North America</SelectItem><SelectItem value="Europe">Europe</SelectItem></SelectContent>
                </Select>
              </div>
              <CreatorLeaderboard creators={creatorInsights} searchQuery={searchQuery} selectedRegion={selectedRegion} showCount={showCount} />
            </div>
          )}

          {activeSection === 'rankings' && <TopRankingsTracker data={data as any} />}
          {activeSection === 'comparison' && <UserComparison data={data as any} />}
          {activeSection === 'content' && <ContentTrends trends={contentTrends} searchQuery={searchQuery} onTagClick={(tag: string) => { setExplorerMode({ active: true, type: 'tag', value: tag }); setActiveSection('explorer') }} />}
          {activeSection === 'servers' && <ServerAnalyticsComponent servers={serverAnalytics} searchQuery={searchQuery} selectedRegion={selectedRegion} showCount={showCount} onServerClick={(s: string) => { setExplorerMode({ active: true, type: 'server', value: s }); setActiveSection('explorer') }} />}
          {activeSection === 'explorer' && explorerMode.active && <UserExplorer data={data as any} filterType={explorerMode.type} filterValue={explorerMode.value} onBack={() => { setExplorerMode({ active: false, type: 'tag', value: '' }); setActiveSection('overview') }} />}
        </main>
      </div>
    </div>
  )
}
