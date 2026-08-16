import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { mapPublicMenuItem, PUBLIC_MENU_ITEM_SELECT } from '@/lib/menu-public-item'

// Public read-only JSON; CDN may cache by full URL (slug + sectionId/categoryId).
// Admin mutations invalidate via the `menu-items` / `restaurant-slug-*` tags.
export const revalidate = 30
export const runtime = 'nodejs'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

async function fetchMenuItems(
  slug: string,
  categoryId: string | null,
  sectionId: string | null
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!restaurant) {
    return null
  }

  if (categoryId) {
    const items = await prisma.item.findMany({
      where: {
        restaurantId: restaurant.id,
        categoryId,
        isActive: true,
      },
      select: PUBLIC_MENU_ITEM_SELECT,
      orderBy: { sortOrder: 'asc' },
    })
    return { items: items.map(mapPublicMenuItem) }
  }

  if (sectionId) {
    const items = await prisma.item.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        category: {
          sectionId,
          isActive: true,
          restaurantId: restaurant.id,
        },
      },
      select: PUBLIC_MENU_ITEM_SELECT,
      orderBy: { sortOrder: 'asc' },
    })
    return { items: items.map(mapPublicMenuItem) }
  }

  return { items: [] }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const sectionId = searchParams.get('sectionId')

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    if (categoryId && sectionId) {
      return NextResponse.json(
        { error: 'Provide either categoryId or sectionId, not both' },
        { status: 400 }
      )
    }

    const cacheKey = `menu-items-v2-${slug}-${categoryId || 'all'}-${sectionId || 'none'}`
    const getCachedItems = unstable_cache(
      () => fetchMenuItems(slug, categoryId, sectionId),
      [cacheKey],
      {
        tags: ['menu-items', 'menu', `restaurant-slug-${slug}`, 'advanced-options'],
        revalidate: 30,
      }
    )

    const result = await getCachedItems()

    if (!result) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache',
          },
        }
      )
    }

    return NextResponse.json(result, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json(
      { items: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache',
        },
      }
    )
  }
}
