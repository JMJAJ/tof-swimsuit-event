import { NextRequest, NextResponse } from 'next/server'
import { getCache } from '@/lib/analytics-storage'

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    // If CRON_SECRET is configured, require it.
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const internalOrigin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.nextUrl.origin

    // Build URL with bypass token for Vercel deployment protection
    const bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    const collectUrl = new URL(`${internalOrigin}/api/analytics/v2/collect`)
    if (bypassToken) {
      collectUrl.searchParams.set('x-vercel-set-bypass-cookie', 'true')
      collectUrl.searchParams.set('x-vercel-protection-bypass', bypassToken)
    }

    const response = await fetch(collectUrl.toString(), {
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
