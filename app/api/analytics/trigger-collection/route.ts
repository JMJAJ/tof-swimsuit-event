import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual analytics collection triggered')
    
    // Trigger the analytics collection
    const response = await fetch(`${request.nextUrl.origin}/api/analytics/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Analytics collection completed successfully')
      return NextResponse.json({ 
        success: true, 
        message: 'Analytics collection triggered successfully',
        data: result 
      })
    } else {
      throw new Error(`Collection failed: ${response.statusText}`)
    }
  } catch (error) {
    console.error('❌ Failed to trigger analytics collection:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}