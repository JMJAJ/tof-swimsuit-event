'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, Crown, Trophy } from 'lucide-react'
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

interface CreatorLeaderboardProps {
    creators: CreatorInsight[]
    searchQuery: string
    selectedRegion: string
    showCount: number
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

const getFirstImageUrl = (imageString: string): string => {
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

export function CreatorLeaderboard({ creators, searchQuery, selectedRegion, showCount }: CreatorLeaderboardProps) {
    const [selectedWork, setSelectedWork] = useState<PlayerWork | null>(null)
    
    const filteredCreators = creators.filter(creator => {
        const matchesSearch = creator.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            creator.serverName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRegion = selectedRegion === 'all' || creator.region === selectedRegion
        return matchesSearch && matchesRegion
    }).slice(0, showCount)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Creators</h3>
                <Badge variant="outline">{filteredCreators.length} creators</Badge>
            </div>
            
            <div className="space-y-3">
                {filteredCreators.map((creator) => (
                    <Card 
                        key={creator.roleName} 
                        className="hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                        onClick={() => setSelectedWork(creator.topWork)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                                {/* Creator Image */}
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        <Image
                                            src={getFirstImageUrl(creator.topWork.image)}
                                            alt={creator.topWork.name}
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
                                        #{creator.rank}
                                    </div>
                                </div>

                                {/* Creator Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {creator.roleName}
                                        </h4>
                                        <Badge variant="outline" className="text-xs">
                                            {creator.region}
                                        </Badge>
                                        {creator.rank <= 3 && (
                                            <Award className={`h-4 w-4 ${
                                                creator.rank === 1 ? 'text-yellow-500' :
                                                creator.rank === 2 ? 'text-gray-400' :
                                                'text-orange-600'
                                            }`} />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        {creator.serverName}
                                    </p>
                                    <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                                        <div>
                                            <p className="text-gray-500">Works</p>
                                            <p className="font-semibold">{creator.totalWorks}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Total Votes</p>
                                            <p className="font-semibold">{creator.totalTickets.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Avg Votes</p>
                                            <p className="font-semibold">{creator.avgTickets.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                                        <p className="text-xs text-gray-500 mb-1">Best Work:</p>
                                        <p className="text-sm font-medium truncate">{creator.topWork.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            {creator.topWork.ticket.toLocaleString()} votes
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

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