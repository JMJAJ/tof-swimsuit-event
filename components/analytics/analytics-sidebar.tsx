'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AnalyticsStatus } from '@/components/analytics-status'
import { Eye, Users, Flame, Server, Activity, Database, Globe, X, GitCompare, Award, Calendar, Zap, Trophy } from 'lucide-react'

interface AnalyticsSidebarProps {
    activeSection: string
    setActiveSection: (section: string) => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
    totalWorks?: number
    uniqueUsers?: number
    serverCount?: number
}

const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: Eye, description: 'Key metrics & charts' },
    { id: 'creators', label: 'Top Creators', icon: Users, description: 'Creator leaderboard' },
    { id: 'rankings', label: 'Top Rankings', icon: Trophy, description: 'Top 50/100 movement tracker' },
    { id: 'comparison', label: 'User Comparison', icon: GitCompare, description: 'Compare creators' },
    { id: 'content', label: 'Content Trends', icon: Flame, description: 'Popular categories' },
    { id: 'servers', label: 'Server Analytics', icon: Server, description: 'Community insights' },

    { id: 'competition', label: 'Competition & Behavior', icon: Award, description: 'Vote competition & user patterns' },
    { id: 'network', label: 'Network Analysis', icon: Zap, description: 'Cross-server connections' },
    { id: 'performance', label: 'Performance', icon: Activity, description: 'System metrics' },
]

export function AnalyticsSidebar({
    activeSection,
    setActiveSection,
    sidebarOpen,
    setSidebarOpen,
    totalWorks,
    uniqueUsers,
    serverCount
}: AnalyticsSidebarProps) {
    return (
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tower of Fantasy</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Works</span>
                        <Badge variant="secondary" className="text-xs">
                            {totalWorks?.toLocaleString() || '0'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Creators</span>
                        <Badge variant="secondary" className="text-xs">
                            {uniqueUsers?.toLocaleString() || '0'}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Servers</span>
                        <Badge variant="secondary" className="text-xs">
                            {serverCount?.toLocaleString() || '0'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1">
                {sidebarItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-start space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${activeSection === item.id
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{item.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {item.description}
                                </div>
                            </div>
                        </button>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
                <AnalyticsStatus />
            </div>
        </div>
    )
}