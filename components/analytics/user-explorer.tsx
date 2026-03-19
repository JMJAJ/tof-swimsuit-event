'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Users, Trophy, Tag, Server, Award } from 'lucide-react'
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

interface UserExplorerProps {
    data: AnalyticsSnapshot[]
    filterType: 'tag' | 'server'
    filterValue: string
    onBack: () => void
}

interface UserData {
    roleName: string
    serverName: string
    region: string
    totalWorks: number
    totalVotes: number
    avgVotes: number
    bestWork: PlayerWork
    matchingWorks: PlayerWork[]
    allTags: string[] // All unique tags this user has used
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

const getTagId = (tagName: string): string => {
    const tagMap: Record<string, string> = {
        'Sweet-Cool': '1',
        'Soft Allure': '2',
        'Dopamine': '3',
        'Retro': '4',
        'Mood Aesthetic': '5',
        'Cosplay Makeup': '6',
        'Vigorous': '7',
        'Elegant': '8',
        'Instant Crush': '9'
    }
    return tagMap[tagName] || tagName
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

export function UserExplorer({ data, filterType, filterValue, onBack }: UserExplorerProps) {
    const [users, setUsers] = useState<UserData[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'totalVotes' | 'matchingWorks' | 'avgVotes'>('totalVotes')
    const [selectedWork, setSelectedWork] = useState<PlayerWork | null>(null)

    useEffect(() => {
        if (data.length === 0) return

        const latest = data[data.length - 1]
        if (!latest.allWorks) return

        let filteredWorks: PlayerWork[] = []

        if (filterType === 'tag') {
            const tagId = getTagId(filterValue)
            filteredWorks = latest.allWorks.filter(work => 
                work.tags?.includes(tagId)
            )
        } else if (filterType === 'server') {
            filteredWorks = latest.allWorks.filter(work => 
                work.serverName === filterValue
            )
        }

        // Group by user
        const userMap = new Map<string, {
            works: PlayerWork[]
            matchingWorks: PlayerWork[]
            totalVotes: number
            serverName: string
            region: string
        }>()

        // First, get all works for each user
        latest.allWorks.forEach(work => {
            if (!userMap.has(work.roleName)) {
                userMap.set(work.roleName, {
                    works: [],
                    matchingWorks: [],
                    totalVotes: 0,
                    serverName: work.serverName,
                    region: work.region || 'Unknown'
                })
            }
            const userData = userMap.get(work.roleName)!
            userData.works.push(work)
            userData.totalVotes += work.ticket
        })

        // Then, add matching works
        filteredWorks.forEach(work => {
            const userData = userMap.get(work.roleName)
            if (userData) {
                userData.matchingWorks.push(work)
            }
        })

        // Convert to array and filter users who have matching works
        const usersData: UserData[] = Array.from(userMap.entries())
            .filter(([, data]) => data.matchingWorks.length > 0)
            .map(([roleName, data]) => {
                const bestWork = data.works.reduce((max, work) => 
                    work.ticket > max.ticket ? work : max
                )
                
                // Get all unique tags this user has used
                const allTagsSet = new Set<string>()
                data.works.forEach(work => {
                    if (work.tags) {
                        work.tags.forEach(tag => allTagsSet.add(tag))
                    }
                })
                const allTags = Array.from(allTagsSet).map(tagId => getTagName(tagId))
                
                return {
                    roleName,
                    serverName: data.serverName,
                    region: data.region,
                    totalWorks: data.works.length,
                    totalVotes: data.totalVotes,
                    avgVotes: Math.round(data.totalVotes / data.works.length),
                    bestWork,
                    matchingWorks: data.matchingWorks,
                    allTags
                }
            })

        setUsers(usersData)
    }, [data, filterType, filterValue])

    const filteredUsers = users.filter(user =>
        user.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.serverName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        switch (sortBy) {
            case 'totalVotes':
                return b.totalVotes - a.totalVotes
            case 'matchingWorks':
                return b.matchingWorks.length - a.matchingWorks.length
            case 'avgVotes':
                return b.avgVotes - a.avgVotes
            default:
                return 0
        }
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                            {filterType === 'tag' ? <Tag className="h-5 w-5" /> : <Server className="h-5 w-5" />}
                            <span>Users with {filterType === 'tag' ? 'tag' : 'server'}: {filterValue}</span>
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {filteredUsers.length} creators found
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                    <div className="flex space-x-1">
                        <Button
                            variant={sortBy === 'totalVotes' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy('totalVotes')}
                        >
                            Total Votes
                        </Button>
                        {/* <Button
                            variant={sortBy === 'matchingWorks' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy('matchingWorks')}
                        >
                            {filterType === 'tag' ? 'Tag' : 'Server'} Works
                        </Button>
                        <Button
                            variant={sortBy === 'avgVotes' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy('avgVotes')}
                        >
                            Avg Votes
                        </Button> */}
                    </div>
                </div>
            </div>

            {/* Users List */}
            <div className="space-y-3">
                {sortedUsers.map((user, index) => (
                    <Card 
                        key={user.roleName} 
                        className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                        onClick={() => setSelectedWork(user.bestWork)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                                {/* Creator Image */}
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <Image
                                            src={getFirstImageUrl(user.bestWork)}
                                            alt={user.bestWork.name}
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.src = '/placeholder.svg'
                                            }}
                                        />
                                    </div>
                                    <div className="absolute -top-1 -left-1 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-xs">
                                        #{index + 1}
                                    </div>
                                </div>

                                {/* Creator Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {user.roleName}
                                        </h4>
                                        <Badge variant="outline" className="text-xs">
                                            {user.region}
                                        </Badge>
                                        {filterType === 'server' && (
                                            <Badge variant="secondary" className="text-xs">
                                                {user.serverName}
                                            </Badge>
                                        )}
                                        {index < 3 && (
                                            <Award className={`h-4 w-4 ${
                                                index === 0 ? 'text-yellow-500' :
                                                index === 1 ? 'text-gray-400' :
                                                'text-orange-600'
                                            }`} />
                                        )}
                                    </div>
                                    {filterType === 'tag' ? (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {user.allTags.slice(0, 4).map((tag, tagIndex) => (
                                                <Badge key={tagIndex} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {user.allTags.length > 4 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{user.allTags.length - 4} more
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {user.serverName}
                                        </p>
                                    )}
                                    <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                                        <div>
                                            <p className="text-gray-500">Works</p>
                                            <p className="font-semibold">{user.totalWorks}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">{filterType === 'tag' ? 'Tag' : 'Server'}</p>
                                            <p className="font-semibold text-blue-600">{user.matchingWorks.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Total Votes</p>
                                            <p className="font-semibold">{user.totalVotes.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Avg Votes</p>
                                            <p className="font-semibold">{user.avgVotes.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                                        <p className="text-xs text-gray-500 mb-1">Best Work:</p>
                                        <p className="text-sm font-medium truncate">{user.bestWork.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {user.bestWork.ticket.toLocaleString()} votes
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {sortedUsers.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Users Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            No creators found with {filterType === 'tag' ? 'tag' : 'server'} "{filterValue}".
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