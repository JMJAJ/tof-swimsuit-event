import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const url = request.nextUrl.pathname

  // Aggressive caching for static assets (images, fonts, etc.)
  if (url.startsWith('/_next/static/') || 
      url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return response
  }

  // Cache analytics data files aggressively (these are static JSON files)
  if (url.startsWith('/analytics-data') || url.includes('analytics-data')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/analytics-data/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)\\.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2|ttf|eot)',
  ],
}
