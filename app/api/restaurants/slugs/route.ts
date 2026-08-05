import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Dev-only helper — disabled in production builds and runtime. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
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
