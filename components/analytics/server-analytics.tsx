'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { Server, Users, Trophy } from 'lucide-react'

interface ServerAnalytics {
    serverName: string
    region: string
    totalWorks: number
    uniqueCreators: number
    avgTicketsPerWork: number
    topCreator: string
    dominantTags?: string[]
    activity?: 'very_active' | 'active' | 'moderate' | 'quiet'
}

interface ServerAnalyticsProps {
    servers: ServerAnalytics[]
    searchQuery: string
    selectedRegion: string
    showCount: number
    onServerClick?: (serverName: string) => void
}

export function ServerAnalyticsComponent({ servers, searchQuery, selectedRegion, showCount, onServerClick }: ServerAnalyticsProps) {
    const filteredServers = servers.filter(server => {
        const matchesSearch = server.serverName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRegion = selectedRegion === 'all' || server.region === selectedRegion
        return matchesSearch && matchesRegion
    }).slice(0, showCount)

    const chartData = filteredServers.slice(0, 15).map(server => ({
        name: server.serverName.length > 10 ? server.serverName.substring(0, 10) + '...' : server.serverName,
        works: server.totalWorks,
        creators: server.uniqueCreators,
        avgVotes: server.avgTicketsPerWork
    }))

    const scatterData = filteredServers.slice(0, 20).map(server => ({
        x: server.uniqueCreators,
        y: server.avgTicketsPerWork,
        name: server.serverName,
        works: server.totalWorks
    }))

    return (
        <div className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Server Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="works" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Creators vs Avg Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <ScatterChart data={scatterData}>
                                <XAxis dataKey="x" name="Creators" tick={{ fontSize: 10 }} />
                                <YAxis dataKey="y" name="Avg Votes" tick={{ fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload
                                            return (
                                                <div className="bg-white dark:bg-gray-800 p-2 border rounded shadow">
                                                    <p className="font-semibold">{data.name}</p>
                                                    <p>Creators: {data.x}</p>
                                                    <p>Avg Votes: {data.y}</p>
                                                    <p>Total Works: {data.works}</p>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Scatter dataKey="y" fill="#8884d8" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Server List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Server Communities</h3>
                    <Badge variant="outline">{filteredServers.length} servers</Badge>
                </div>

                {filteredServers.map((server, index) => (
                    <Card 
                        key={server.serverName} 
                        className={`hover:shadow-md transition-all duration-200 ${onServerClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                        onClick={() => onServerClick?.(server.serverName)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700">
                                        <Server className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {server.serverName}
                                            </h4>
                                            <Badge variant="outline" className="text-xs">
                                                {server.region}
                                            </Badge>
                                            <Badge variant={
                                                (server.activity || 'quiet') === 'very_active' ? 'default' :
                                                    (server.activity || 'quiet') === 'active' ? 'secondary' :
                                                        (server.activity || 'quiet') === 'moderate' ? 'outline' :
                                                            'destructive'
                                            } className="text-xs">
                                                {(server.activity || 'quiet').replace('_', ' ')}
                                            </Badge>
                                            {onServerClick && (
                                                <Badge variant="outline" className="text-xs">
                                                    Click to explore
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                                            <div>
                                                <p className="text-gray-500">Works</p>
                                                <p className="font-semibold">{server.totalWorks}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Creators</p>
                                                <p className="font-semibold">{server.uniqueCreators}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Avg Votes</p>
                                                <p className="font-semibold">{server.avgTicketsPerWork.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Top Creator</p>
                                                <p className="font-semibold truncate">{server.topCreator}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Popular Categories:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(server.dominantTags || []).map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {(server.dominantTags || []).length === 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        No tag data
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        #{index + 1}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}