'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, CartesianGrid } from 'recharts'
import { Search, Plus, X, Users, Server } from 'lucide-react'
import { WorkModal } from '@/components/work-modal'

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

interface UserComparisonData {
    roleName: string
    serverName: string
    region: string
    totalWorks: number
    totalVotes: number
    avgVotes: number
    bestWork: PlayerWork
    recentWork: PlayerWork
    tags: string[]
    snapshotDate: string
    activityPattern: Array<{ period: string; votes: number }>
}

interface UserComparisonProps {
    data: AnalyticsSnapshot[]
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

const getFirstImageUrl = (work?: Pick<PlayerWork, 'image' | 'imageUrls'>): string => {
    if (work?.imageUrls?.length) {
        return work.imageUrls[0] || '/placeholder.svg'
    }

    const imageString = work?.image
    if (!imageString || typeof imageString !== 'string') {
        return '/placeholder.svg'
    }

    try {
        const images = JSON.parse(imageString)
        if (Array.isArray(images) && images.length > 0) {
            // Remove trailing backslashes and clean the URL
            return images[0].url?.replace(/\\+$/, '') || '/placeholder.svg'
        }
    } catch (e) {
        // If parsing fails, try to extract URL from string
        const urlMatch = imageString.match(/https?:\/\/[^"\\]+/)
        if (urlMatch) {
            return urlMatch[0].replace(/\\+$/, '')
        }
    }
    return '/placeholder.svg'
}

export function UserComparison({ data }: UserComparisonProps) {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [selectedSnapshots, setSelectedSnapshots] = useState<Record<string, number>>({})
    const [userSearchQuery, setUserSearchQuery] = useState('')
    const [comparisonData, setComparisonData] = useState<UserComparisonData[]>([])
    const [availableUsers, setAvailableUsers] = useState<string[]>([])
    const [selectedWork, setSelectedWork] = useState<PlayerWork | null>(null)

    // Get all unique users from all snapshots
    useEffect(() => {
        const allUsers = new Set<string>()
        data.forEach(snapshot => {
            snapshot.allWorks?.forEach(work => {
                allUsers.add(work.roleName)
            })
        })
        setAvailableUsers(Array.from(allUsers).sort())
    }, [data])

    // Generate comparison data when users are selected
    useEffect(() => {
        if (selectedUsers.length === 0) {
            setComparisonData([])
            return
        }

        const newComparisonData: UserComparisonData[] = []

        selectedUsers.forEach(userName => {
            const snapshotIndex = selectedSnapshots[userName] ?? data.length - 1
            const snapshot = data[snapshotIndex]

            if (!snapshot?.allWorks) return

            const userWorks = snapshot.allWorks.filter(work => work.roleName === userName)
            if (userWorks.length === 0) return

            const totalVotes = userWorks.reduce((sum, work) => sum + work.ticket, 0)
            const bestWork = userWorks.reduce((max, work) => work.ticket > max.ticket ? work : max)
            const recentWork = userWorks.reduce((latest, work) =>
                new Date(work.createtime) > new Date(latest.createtime) ? work : latest
            )

            const allTags = userWorks.flatMap(w => w.tags || [])
            const uniqueTags = Array.from(new Set(allTags)).map(getTagName)

            // Voting activity pattern over time (using all available snapshots, sorted chronologically)
            const activityPattern: Array<{ period: string; votes: number }> = []
            if (data.length > 1) {
                // Sort snapshots by timestamp first
                const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)

                sortedData.forEach((snap) => {
                    const votesInSnapshot = snap.allWorks?.filter(w => w.roleName === userName)
                        .reduce((sum, work) => sum + work.ticket, 0) || 0
                    const timestamp = new Date(snap.timestamp)
                    const period = `${timestamp.getMonth() + 1}/${timestamp.getDate()} ${timestamp.getHours()}:${timestamp.getMinutes().toString().padStart(2, '0')}`
                    activityPattern.push({
                        period,
                        votes: votesInSnapshot
                    })
                })
            }

            newComparisonData.push({
                roleName: userName,
                serverName: userWorks[0].serverName,
                region: userWorks[0].region || 'Unknown',
                totalWorks: userWorks.length,
                totalVotes,
                avgVotes: Math.round(totalVotes / userWorks.length),
                bestWork,
                recentWork,
                tags: uniqueTags,
                snapshotDate: new Date(snapshot.timestamp).toLocaleDateString(),
                activityPattern
            })
        })

        setComparisonData(newComparisonData)
    }, [selectedUsers, selectedSnapshots, data])

    const addUser = (userName: string) => {
        if (!selectedUsers.includes(userName) && selectedUsers.length < 5) {
            setSelectedUsers([...selectedUsers, userName])
            setSelectedSnapshots({
                ...selectedSnapshots,
                [userName]: data.length - 1 // Default to latest snapshot
            })
        }
        setUserSearchQuery('')
    }

    const removeUser = (userName: string) => {
        setSelectedUsers(selectedUsers.filter(u => u !== userName))
        const newSnapshots = { ...selectedSnapshots }
        delete newSnapshots[userName]
        setSelectedSnapshots(newSnapshots)
    }

    const updateUserSnapshot = (userName: string, snapshotIndex: number) => {
        setSelectedSnapshots({
            ...selectedSnapshots,
            [userName]: snapshotIndex
        })
    }

    const filteredUsers = availableUsers.filter(user =>
        user.toLowerCase().includes(userSearchQuery.toLowerCase()) &&
        !selectedUsers.includes(user)
    ).slice(0, 10)

    // Prepare chart data
    const comparisonChartData = comparisonData.map(user => ({
        name: user.roleName,
        totalWorks: user.totalWorks,
        totalVotes: user.totalVotes,
        avgVotes: user.avgVotes
    }))

    const radarData = comparisonData.length > 0 ? [
        {
            metric: 'Total Works',
            ...comparisonData.reduce((acc, user) => ({
                ...acc,
                [user.roleName]: user.totalWorks
            }), {})
        },
        {
            metric: 'Avg Votes',
            ...comparisonData.reduce((acc, user) => ({
                ...acc,
                [user.roleName]: user.avgVotes / 100 // Scale down for radar
            }), {})
        },
        {
            metric: 'Best Work Votes',
            ...comparisonData.reduce((acc, user) => ({
                ...acc,
                [user.roleName]: user.bestWork.ticket / 1000 // Scale down for radar
            }), {})
        },
        {
            metric: 'Tag Diversity',
            ...comparisonData.reduce((acc, user) => ({
                ...acc,
                [user.roleName]: user.tags.length
            }), {})
        }
    ] : []

    return (
        <div className="space-y-6">
            {/* User Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Select Users to Compare</span>
                        <Badge variant="outline">{selectedUsers.length}/5</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search for users */}
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search for users to compare..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="flex-1"
                        />
                    </div>

                    {/* Available users */}
                    {userSearchQuery && (
                        <div className="flex flex-wrap gap-2">
                            {filteredUsers.map(user => (
                                <Button
                                    key={user}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addUser(user)}
                                    className="text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    {user}
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* Selected users */}
                    {selectedUsers.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Selected Users:</h4>
                            <div className="space-y-2">
                                {selectedUsers.map(user => (
                                    <div key={user} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                        <span className="font-medium">{user}</span>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                value={selectedSnapshots[user]?.toString() || (data.length - 1).toString()}
                                                onValueChange={(value) => updateUserSnapshot(user, parseInt(value))}
                                            >
                                                <SelectTrigger className="w-32 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {data.map((snapshot, index) => (
                                                        <SelectItem key={index} value={index.toString()}>
                                                            {new Date(snapshot.timestamp).toLocaleDateString()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeUser(user)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Comparison Results */}
            {comparisonData.length > 0 && (
                <>
                    {/* User Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comparisonData.map((user, index) => (
                            <Card 
                                key={user.roleName} 
                                className="relative cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01]"
                                onClick={() => setSelectedWork(user.bestWork)}
                            >
                                <CardContent className="p-4">
                                    {/* User Header with Image */}
                                    <div className="flex items-start space-x-3 mb-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                <Image
                                                    src={getFirstImageUrl(user.bestWork)}
                                                    alt={user.bestWork.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.src = '/placeholder.svg'
                                                    }}
                                                />
                                            </div>
                                            <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0">
                                                #{index + 1}
                                            </Badge>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">{user.roleName}</h3>
                                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Server className="h-3 w-3" />
                                                <span>{user.serverName}</span>
                                                <Badge variant="outline" className="text-xs">{user.region}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                        <div>
                                            <p className="text-gray-500">Total Works</p>
                                            <p className="font-semibold">{user.totalWorks}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Total Votes</p>
                                            <p className="font-semibold">{user.totalVotes.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Avg Votes</p>
                                            <p className="font-semibold">{user.totalWorks > 1 ? user.avgVotes.toLocaleString() : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Best Work</p>
                                            <p className="font-semibold">{user.bestWork.ticket.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                                            <p className="text-xs text-gray-500">Best Work:</p>
                                            <p className="text-sm font-medium truncate">{user.bestWork.name}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                                            <p className="text-xs text-gray-500">Recent Work:</p>
                                            <p className="text-sm font-medium truncate">{user.recentWork.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Tags:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {user.tags.slice(0, 3).map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {user.tags.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{user.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                                        Data from: {user.snapshotDate}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Comparison Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bar Chart Comparison */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Works & Votes Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={comparisonChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="totalWorks" fill="#3B82F6" name="Total Works" />
                                        <Bar dataKey="avgVotes" fill="#10B981" name="Avg Votes" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Radar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Performance Radar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                                        <PolarRadiusAxis tick={{ fontSize: 8 }} />
                                        {comparisonData.map((user, index) => (
                                            <Radar
                                                key={user.roleName}
                                                name={user.roleName}
                                                dataKey={user.roleName}
                                                stroke={`hsl(${index * 60}, 70%, 50%)`}
                                                fill={`hsl(${index * 60}, 70%, 50%)`}
                                                fillOpacity={0.1}
                                            />
                                        ))}
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Voting Timeline */}
                    {comparisonData.some(user => user.activityPattern.length > 1) && (() => {
                        // Get all unique timestamps and sort them chronologically
                        const allTimestamps = new Set<number>()
                        data.forEach(snap => allTimestamps.add(snap.timestamp))

                        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

                        const mergedData = sortedTimestamps.map(timestamp => {
                            const date = new Date(timestamp)
                            const period = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`

                            const dataPoint: any = { period }
                            comparisonData.forEach(user => {
                                const snap = data.find(s => s.timestamp === timestamp)
                                const votesInSnapshot = snap?.allWorks?.filter(w => w.roleName === user.roleName)
                                    .reduce((sum, work) => sum + work.ticket, 0) || 0
                                dataPoint[user.roleName] = votesInSnapshot
                            })
                            return dataPoint
                        })

                        return (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">Voting Timeline</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={mergedData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Total Votes']} />
                                            {comparisonData.map((user, index) => (
                                                <Line
                                                    key={user.roleName}
                                                    type="monotone"
                                                    dataKey={user.roleName}
                                                    stroke={`hsl(${index * 60}, 70%, 50%)`}
                                                    strokeWidth={2}
                                                    name={user.roleName}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )
                    })()}
                </>
            )}

            {/* Empty State */}
            {selectedUsers.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Users Selected
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Search and select up to 5 users to compare their performance, activity, and content preferences.
                        </p>
                        <p className="text-sm text-gray-500">
                            You can also choose different time snapshots for each user to see how they've evolved over time.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Work Modal */}
            {selectedWork && (
                <WorkModal
                    work={selectedWork}
                    onClose={() => setSelectedWork(null)}
                />
            )}
        </div>
    )
}