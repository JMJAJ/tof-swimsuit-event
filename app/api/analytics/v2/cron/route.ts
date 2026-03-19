import { NextRequest, NextResponse } from 'next/server'
import { loadLatestSnapshot, getCache } from '@/lib/analytics-storage'

const MIN_REFRESH_INTERVAL_MS = 55 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    // If CRON_SECRET is configured, require it.
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const latest = await loadLatestSnapshot('v2')
    const ageMs = latest ? Date.now() - latest.timestamp : Number.POSITIVE_INFINITY

    // Skip if we already have a recent snapshot to reduce free-tier usage.
    if (ageMs < MIN_REFRESH_INTERVAL_MS) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Recent v2 snapshot already exists',
        ageMinutes: Math.floor(ageMs / 60000),
      })
    }

    const internalOrigin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.nextUrl.origin

    const response = await fetch(`${internalOrigin}/api/analytics/v2/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-trigger-source': 'vercel-cron-v2',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json({
        success: false,
        skipped: false,
        error: `V2 collect failed (${response.status})`,
        details: errorBody,
      }, { status: 500 })
    }

    const result = await response.json()
    getCache().clear()

    return NextResponse.json({
      success: true,
      skipped: false,
      source: 'vercel-cron',
      result,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown cron error',
    }, { status: 500 })
  }
}
