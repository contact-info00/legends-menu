import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

// Public read-only JSON; CDN may cache by full URL (slug + sectionId/categoryId).
// Admin mutations invalidate via the `menu-items` / `restaurant-slug-*` tags.
export const revalidate = 30
export const runtime = 'nodejs'


const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

const ITEM_SELECT = {
  id: true,
  nameKu: true,
  nameEn: true,
  nameAr: true,
  descriptionKu: true,
  descriptionEn: true,
  descriptionAr: true,
  price: true,
  imageR2Url: true,
  imageMediaId: true,
  sortOrder: true,
  isActive: true,
  categoryId: true,
  _count: {
    select: {
      advancedOptionGroups: { where: { isActive: true } },
      itemLevels: { where: { isActive: true } },
    },
  },
} as const

function mapPublicItem(
  item: {
    id: string
    nameKu: string
    nameEn: string
    nameAr: string
    descriptionKu: string | null
    descriptionEn: string | null
    descriptionAr: string | null
    price: number
    imageR2Url: string | null
    imageMediaId: string | null
    sortOrder: number
    isActive: boolean
    categoryId: string
    _count: { advancedOptionGroups: number; itemLevels: number }
  }
) {
  return {
    id: item.id,
    nameKu: item.nameKu,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    descriptionKu: item.descriptionKu,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    price: Number(item.price),
    imageR2Url: item.imageR2Url,
    imageMediaId: item.imageMediaId,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    categoryId: item.categoryId,
    hasAdvancedOptions:
      item._count.advancedOptionGroups > 0 || item._count.itemLevels > 0,
  }
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
      select: ITEM_SELECT,
      orderBy: { sortOrder: 'asc' },
    })
    return { items: items.map(mapPublicItem) }
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
      select: ITEM_SELECT,
      orderBy: { sortOrder: 'asc' },
    })
    return { items: items.map(mapPublicItem) }
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

    const cacheKey = `menu-items-${slug}-${categoryId || 'all'}-${sectionId || 'none'}`
    const getCachedItems = unstable_cache(
      () => fetchMenuItems(slug, categoryId, sectionId),
      [cacheKey],
      {
        tags: ['menu-items', 'menu', `restaurant-slug-${slug}`],
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
