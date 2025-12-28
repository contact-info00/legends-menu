import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Temporary debug endpoint - remove or add admin auth after fixing
export async function GET() {
  try {
    // Only allow in development or with admin auth
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to add admin auth here
      // For now, we'll allow it but log access
      console.warn('⚠️ Debug endpoint /api/restaurants/slugs accessed in production')
    }

    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        nameEn: true,
        slug: true,
      },
      orderBy: {
        nameEn: 'asc',
      },
    })

    return NextResponse.json(
      {
        count: restaurants.length,
        restaurants,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching restaurant slugs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

