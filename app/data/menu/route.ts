import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 60 // Revalidate every 60 seconds (public endpoint, safe to cache)

export async function GET(request: NextRequest) {
  try {
    // Require slug parameter - no fallback
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 })
    }

    // Resolve restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    })

    // Return 404 if restaurant doesn't exist (deleted)
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found', sections: [] },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    }

    // Fetch sections for this restaurant only
    const sections = await prisma.section.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
      include: {
        categories: {
          where: {
            restaurantId: restaurant.id,
            isActive: true,
          },
          include: {
            items: {
              where: {
                restaurantId: restaurant.id,
                isActive: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json(
      { sections: sections || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching menu:', error)
    // Return empty sections array instead of error to prevent page crashes
    return NextResponse.json(
      { sections: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  }
}


