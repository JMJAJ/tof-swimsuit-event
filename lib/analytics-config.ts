// Analytics version configuration
// Each version has its own API endpoint and data storage

export type AnalyticsVersion = 'v1' | 'v2'

export interface AnalyticsVersionConfig {
  id: AnalyticsVersion
  name: string
  description: string
  route: string
  apiEndpoint: string
  actId: string
  storageKey: string
  headers: Record<string, string>
}

export const ANALYTICS_VERSIONS: Record<AnalyticsVersion, AnalyticsVersionConfig> = {
  v1: {
    id: 'v1',
    name: 'Analytics / Legacy (V1)',
    description: 'JSON snapshots from analytics-data',
    route: '/analytics',
    apiEndpoint: 'https://event.games.wanmei.com/m/ht/xote',
    actId: 'ht_20250910',
    storageKey: 'analytics-data', // Uses existing analytics-data folder
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  },
  v2: {
    id: 'v2',
    name: 'Analytics V2',
    description: 'Live endpoint refresh (hourly)',
    route: '/analytics/v2',
    apiEndpoint: 'https://event.perfectworld.com/m/ht/xote',
    actId: 'ht_20250910',
    storageKey: 'analytics-v2',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://tof.perfectworld.com',
      'Referer': 'https://tof.perfectworld.com/',
    }
  }
}

export function getVersionConfig(version: AnalyticsVersion): AnalyticsVersionConfig {
  return ANALYTICS_VERSIONS[version]
}

export function getVersionFromPath(pathname: string): AnalyticsVersion {
  if (pathname.startsWith('/analytics/v2')) return 'v2'
  if (pathname.startsWith('/analytics/legacy')) return 'v1'
  return 'v2' // default
}

// Vercel-compatible storage using Blob
export const BLOB_STORE_URL = process.env.BLOB_STORE_URL || ''

// For local development, fall back to filesystem
export const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN
