import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Force refresh by calling the user-index endpoint
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/user-index`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh index: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      message: "User index refreshed successfully",
      stats: data.stats
    })

  } catch (error) {
    console.error("Error refreshing user index:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to refresh user index",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}