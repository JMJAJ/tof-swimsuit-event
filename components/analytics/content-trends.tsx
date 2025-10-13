'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Flame, TrendingUp, Star } from 'lucide-react'

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

interface ContentTrend {
    tag: string
    count: number
    avgTickets: number
    topWork: PlayerWork
    growth: number
    momentum: 'hot' | 'trending' | 'stable' | 'cooling'
}

interface ContentTrendsProps {
    trends: ContentTrend[]
    searchQuery: string
    onTagClick?: (tag: string) => void
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export function ContentTrends({ trends, searchQuery, onTagClick }: ContentTrendsProps) {
    const filteredTrends = trends.filter(trend =>
        trend.tag.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const chartData = filteredTrends.slice(0, 8).map(trend => ({
        name: trend.tag,
        count: trend.count,
        avgTickets: trend.avgTickets
    }))

    const pieData = filteredTrends.slice(0, 6).map(trend => ({
        name: trend.tag,
        value: trend.count
    }))

    return (
        <div className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Content Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Votes by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="avgTickets" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Trend List */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Categories</h3>
                {filteredTrends.slice(0, 10).map((trend, index) => (
                    <Card 
                        key={trend.tag} 
                        className={`hover:shadow-md transition-all duration-200 ${onTagClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                        onClick={() => onTagClick?.(trend.tag)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${
                                        trend.momentum === 'hot' ? 'bg-red-500' :
                                        trend.momentum === 'trending' ? 'bg-orange-500' :
                                        'bg-blue-500'
                                    }`}>
                                        {trend.momentum === 'hot' ? <Flame className="h-4 w-4" /> :
                                         trend.momentum === 'trending' ? <TrendingUp className="h-4 w-4" /> :
                                         <Star className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                {trend.tag}
                                            </h4>
                                            <Badge variant={
                                                trend.momentum === 'hot' ? 'destructive' :
                                                trend.momentum === 'trending' ? 'default' :
                                                'secondary'
                                            } className="text-xs">
                                                {trend.momentum}
                                            </Badge>
                                            {onTagClick && (
                                                <Badge variant="outline" className="text-xs">
                                                    Click to explore
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            <span>{trend.count} works</span>
                                            <span>Avg: {trend.avgTickets.toLocaleString()}</span>
                                            <span>Top: {trend.topWork.ticket.toLocaleString()}</span>
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