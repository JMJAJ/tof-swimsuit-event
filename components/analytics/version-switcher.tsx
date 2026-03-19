'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ANALYTICS_VERSIONS, AnalyticsVersion } from '@/lib/analytics-config'
import { Sparkles } from 'lucide-react'

export function VersionSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  
  // Determine current version from path
  let currentVersion: AnalyticsVersion = 'v1'
  if (pathname.startsWith('/analytics/v2')) currentVersion = 'v2'

  return (
    <div className="flex h-8 items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
      {/* V1 / Legacy Button */}
      <button
        onClick={() => router.push('/analytics')}
        className={`flex h-8 items-center px-3 text-xs font-medium transition-colors ${
          currentVersion === 'v1'
            ? 'bg-blue-600 text-white'
            : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        Legacy / V1
      </button>
      
      {/* Slash Separator */}
      <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />
      
      {/* V2 Button */}
      <button
        onClick={() => router.push('/analytics/v2')}
        className={`flex h-8 items-center gap-1 px-3 text-xs font-medium transition-colors ${
          currentVersion === 'v2'
            ? 'bg-blue-600 text-white'
            : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <Sparkles className="h-3 w-3" />
        V2
      </button>
    </div>
  )
}

export function VersionBadge({ version }: { version: AnalyticsVersion }) {
  const config = ANALYTICS_VERSIONS[version]
  
  return (
    <Badge 
      variant={version === 'v2' ? 'default' : version === 'v1' ? 'secondary' : 'outline'}
      className={`h-8 rounded-md px-3 text-xs font-medium ${version === 'v2' ? 'bg-blue-600' : ''}`}
    >
      {config.name} - {config.description}
    </Badge>
  )
}
