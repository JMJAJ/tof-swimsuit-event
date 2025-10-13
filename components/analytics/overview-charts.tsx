'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, BarChart, Bar } from 'recharts'
import { TrendingUp, Globe, Clock, Activity } from 'lucide-react'

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

interface OverviewChartsProps {
    data: AnalyticsSnapshot[]
    latest: AnalyticsSnapshot | undefined
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4']

export function OverviewCharts({ data, latest }: OverviewChartsProps) {
    const chartData = data.map(snapshot => ({
        time: new Date(snapshot.timestamp).toLocaleTimeString(),
        totalWorks: snapshot.totalWorks,
        uniqueUsers: snapshot.uniqueUsers,
        avgVotes: snapshot.avgTicketsPerWork || 0,
        totalVotes: snapshot.allWorks ? snapshot.allWorks.reduce((sum: number, work: PlayerWork) => sum + work.ticket, 0) : 0,
        topVotes: snapshot.allWorks ? Math.max(...snapshot.allWorks.map((work: PlayerWork) => work.ticket)) : 0
    }))

    const regionData = latest ? (() => {
        // Ensure all regions are included, even if missing from data
        const allRegions = {
            'Asia-Pacific': 0,
            'North America': 0,
            'Europe': 0,
            'South America': 0,
            'Southeast Asia': 0,
            'Korea': 0,
            'Unknown': 0,
            ...latest.worksByRegion // Override with actual data
        }
        
        const filteredRegions = Object.entries(allRegions)
            .filter(([region, count]) => count > 0) // Only show regions with data
        
        const totalDisplayedWorks = filteredRegions.reduce((sum, [, count]) => sum + count, 0)
        
        return filteredRegions.map(([region, count]) => ({
            region: region,
            fullRegion: region,
            count,
            percentage: ((count / totalDisplayedWorks) * 100).toFixed(1)
        }))
    })() : []

    const serverData = latest ? latest.topServers.slice(0, 10).map(server => ({
        name: server.server.length > 12 ? server.server.substring(0, 12) + '...' : server.server,
        count: server.count
    })) : []

    const timeSlotData = latest ? latest.timeSlots?.map(slot => ({
        name: slot.slot.replace(' (', '\n('),
        count: slot.count
    })) || [] : []

    const ticketRangeData = latest ? latest.ticketRanges?.map(range => ({
        name: range.range,
        count: range.count
    })) || [] : []

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Trend */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>Growth Over Time</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="totalWorks"
                                stroke="#3B82F6"
                                fill="#3B82F6"
                                fillOpacity={0.1}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Regional Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <Globe className="h-4 w-4" />
                        <span>Regional Distribution</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={regionData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ fullRegion, percentage }) => `${fullRegion}: ${percentage}%`}
                                outerRadius={90}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {regionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value, name, props) => [
                                    `${Number(value).toLocaleString()} works (${props.payload.percentage}%)`,
                                    props.payload.fullRegion
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Servers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <Activity className="h-4 w-4" />
                        <span>Most Active Servers</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={serverData}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10B981" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Activity by Time */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        <span>Activity by Time of Day</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={timeSlotData}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Total Votes Over Time */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>Total Votes Over Time</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Total Votes']} />
                            <Area
                                type="monotone"
                                dataKey="totalVotes"
                                stroke="#10B981"
                                fill="#10B981"
                                fillOpacity={0.2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Vote Velocity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-sm font-medium">
                        <Activity className="h-4 w-4" />
                        <span>Vote Velocity</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData.map((item, index) => ({
                            ...item,
                            newVotes: index > 0 ? item.totalVotes - chartData[index - 1].totalVotes : 0
                        }))}>
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'New Votes']} />
                            <Bar dataKey="newVotes" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}