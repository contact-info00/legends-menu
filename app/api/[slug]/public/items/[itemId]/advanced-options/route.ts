import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { loadAdvancedOptionsForItem } from '@/lib/advanced-options-server'

export const revalidate = 30
export const runtime = 'nodejs'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

async function fetchPublicAdvancedOptions(slug: string, itemId: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!restaurant) {
    return null
  }

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      restaurantId: restaurant.id,
      isActive: true,
    },
    select: { id: true },
  })

  if (!item) {
    return null
  }

  const data = await loadAdvancedOptionsForItem(item.id, true)

  return {
    itemId: item.id,
    groups: data.groups
      .filter((group) => group.isActive)
      .map((group) => ({
        id: group.id,
        nameKu: group.nameKu,
        nameEn: group.nameEn,
        nameAr: group.nameAr,
        selectionMode: group.selectionMode,
        sortOrder: group.sortOrder,
        options: group.options
          .filter((option) => option.isActive)
          .map((option) => ({
            id: option.id,
            nameKu: option.nameKu,
            nameEn: option.nameEn,
            nameAr: option.nameAr,
            priceAdjustment: option.priceAdjustment,
            sortOrder: option.sortOrder,
          })),
      })),
    levels: data.levels
      .filter((level) => level.isActive)
      .map((level) => ({
        id: level.id,
        nameKu: level.nameKu,
        nameEn: level.nameEn,
        nameAr: level.nameAr,
        value: level.value,
        sortOrder: level.sortOrder,
      })),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string; itemId: string } }
) {
  try {
    const { slug, itemId } = params

    const getCached = unstable_cache(
      () => fetchPublicAdvancedOptions(slug, itemId),
      [`public-advanced-options-${slug}-${itemId}`],
      {
        revalidate: 30,
        tags: ['menu-items', `restaurant-slug-${slug}`, 'advanced-options'],
      }
    )

    const data = await getCached()

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Error loading public advanced options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
