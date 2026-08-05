import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


const DEFAULT_UI_SETTINGS = {
  sectionTitleSize: 22,
  categoryTitleSize: 16,
  itemNameSize: 14,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 13,
  bottomNavCategorySize: 13,
  currency: 'IQD',
}

const DEFAULT_RESPONSE = {
  ...DEFAULT_UI_SETTINGS,
  serviceChargePercent: 0,
  headerFooterBgColor: null,
  glassTintColor: null,
}

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

const querySchema = z.object({
  slug: z.string().min(1).optional(),
  restaurantId: z.string().min(1).optional(),
})

async function fetchUiSettingsForRestaurant(slug: string | null, restaurantId: string | null) {
  let restaurant
  if (restaurantId) {
    restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, serviceChargePercent: true },
    })
  } else if (slug) {
    restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, serviceChargePercent: true },
    })
  }

  if (!restaurant) {
    return null
  }

  let settings
  try {
    settings = await prisma.uiSettings.findUnique({
      where: { restaurantId: restaurant.id },
    })
  } catch (findError: any) {
    if (findError?.code === 'P2021' || findError?.code === 'P2022') {
      try {
        settings = await prisma.uiSettings.create({
          data: {
            restaurantId: restaurant.id,
            ...DEFAULT_UI_SETTINGS,
          },
        })
      } catch {
        return DEFAULT_RESPONSE
      }
    } else {
      throw findError
    }
  }

  if (!settings) {
    try {
      settings = await prisma.uiSettings.create({
        data: {
          restaurantId: restaurant.id,
          ...DEFAULT_UI_SETTINGS,
        },
      })
    } catch {
      return DEFAULT_RESPONSE
    }
  }

  const theme = await prisma.theme.findUnique({
    where: { restaurantId: restaurant.id },
    select: { headerFooterBgColor: true, glassTintColor: true },
  })

  return {
    sectionTitleSize: settings.sectionTitleSize,
    categoryTitleSize: settings.categoryTitleSize,
    itemNameSize: settings.itemNameSize,
    itemDescriptionSize: settings.itemDescriptionSize,
    itemPriceSize: settings.itemPriceSize,
    headerLogoSize: settings.headerLogoSize,
    bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? DEFAULT_UI_SETTINGS.bottomNavSectionSize,
    bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? DEFAULT_UI_SETTINGS.bottomNavCategorySize,
    currency: (settings as any).currency ?? DEFAULT_UI_SETTINGS.currency,
    serviceChargePercent: restaurant.serviceChargePercent ?? 0,
    headerFooterBgColor: theme?.headerFooterBgColor ?? null,
    glassTintColor: theme?.glassTintColor ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = {
      slug: searchParams.get('slug'),
      restaurantId: searchParams.get('restaurantId'),
    }

    const validation = querySchema.safeParse(query)
    if (!validation.success || (!query.slug && !query.restaurantId)) {
      return NextResponse.json(
        { error: 'Either slug or restaurantId parameter is required' },
        { status: 400 }
      )
    }

    const cacheKey = query.restaurantId
      ? `ui-settings-restaurant-${query.restaurantId}`
      : `ui-settings-slug-${query.slug}`

    const getCachedUiSettings = unstable_cache(
      () => fetchUiSettingsForRestaurant(query.slug, query.restaurantId),
      [cacheKey],
      {
        tags: ['ui-settings', query.slug ? `restaurant-slug-${query.slug}` : `restaurant-${query.restaurantId}`],
        revalidate: 30,
      }
    )

    const settings = await getCachedUiSettings()

    if (!settings) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404, headers: NO_STORE_HEADERS }
      )
    }

    return NextResponse.json(settings, { headers: PUBLIC_CACHE_HEADERS })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching UI settings:', error)
    }

    return NextResponse.json(DEFAULT_RESPONSE, { headers: PUBLIC_CACHE_HEADERS })
  }
}
