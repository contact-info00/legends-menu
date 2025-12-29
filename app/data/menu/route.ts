import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

async function getMenuSections() {
  return await prisma.section.findMany({
    where: {
      isActive: true,
    },
    include: {
      categories: {
        where: {
          isActive: true,
        },
        include: {
          items: {
            where: {
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
}

// Cache the menu data with tag for invalidation
const getCachedMenuSections = unstable_cache(
  getMenuSections,
  ['menu-sections'],
  {
    tags: ['menu'],
    revalidate: 5, // Revalidate every 5 seconds as fallback
  }
)

export async function GET() {
  try {
    const sections = await getCachedMenuSections()

    return NextResponse.json(
      { sections: sections || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching menu:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // Return empty sections array instead of error to prevent page crashes
    return NextResponse.json(
      { sections: [], error: 'Failed to load menu data' },
      {
        status: 200, // Return 200 with empty data instead of 500
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    )
  }
}

