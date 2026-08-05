import { unstable_cache } from 'next/cache'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const DEFAULT_THEME = {
  appBg: '#400810',
  menuBackgroundR2Key: null,
  menuBackgroundR2Url: null,
  itemNameTextColor: null,
  itemPriceTextColor: null,
  itemDescriptionTextColor: null,
  bottomNavSectionNameColor: null,
  categoryNameColor: null,
  headerFooterBgColor: null,
  glassTintColor: null,
} as const

export type PublicTheme = {
  id?: string
  appBg: string
  menuBackgroundR2Key?: string | null
  menuBackgroundR2Url?: string | null
  itemNameTextColor?: string | null
  itemPriceTextColor?: string | null
  itemDescriptionTextColor?: string | null
  bottomNavSectionNameColor?: string | null
  categoryNameColor?: string | null
  headerFooterBgColor?: string | null
  glassTintColor?: string | null
  restaurantId?: string
  createdAt?: Date
  updatedAt?: Date
}

export type ThemePayload = {
  theme: PublicTheme
}

export const THEME_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
} as const

export const THEME_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
} as const

async function fetchThemeForSlug(slug: string): Promise<ThemePayload | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!restaurant) {
    return null
  }

  const theme = await prisma.theme.findUnique({
    where: { restaurantId: restaurant.id },
  })

  if (!theme) {
    return { theme: { ...DEFAULT_THEME } }
  }

  const themeResponse = theme as Record<string, unknown>

  return {
    theme: {
      id: theme.id,
      appBg: theme.appBg,
      menuBackgroundR2Key: (themeResponse.menuBackgroundR2Key as string | null) || null,
      menuBackgroundR2Url: (themeResponse.menuBackgroundR2Url as string | null) || null,
      itemNameTextColor: (themeResponse.itemNameTextColor as string | null) || null,
      itemPriceTextColor: (themeResponse.itemPriceTextColor as string | null) || null,
      itemDescriptionTextColor: (themeResponse.itemDescriptionTextColor as string | null) || null,
      bottomNavSectionNameColor: (themeResponse.bottomNavSectionNameColor as string | null) || null,
      categoryNameColor: (themeResponse.categoryNameColor as string | null) || null,
      headerFooterBgColor: (themeResponse.headerFooterBgColor as string | null) || null,
      glassTintColor: (themeResponse.glassTintColor as string | null) || null,
      restaurantId: theme.restaurantId,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    },
  }
}

/** Resolve restaurant slug from theme API query or referer path. */
export function resolveThemeSlugFromRequest(request: NextRequest): string | null {
  let slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    const referer = request.headers.get('referer')
    if (referer) {
      const refererUrl = new URL(referer)
      const pathParts = refererUrl.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0 && pathParts[0] !== 'super-admin' && pathParts[0] !== 'admin') {
        slug = pathParts[0]
      }
    }
  }

  return slug
}

/** Server-side cached theme lookup — shared by /data/theme and [slug]/layout. */
export async function getCachedThemeForSlug(slug: string): Promise<ThemePayload | null> {
  const getCachedTheme = unstable_cache(
    () => fetchThemeForSlug(slug),
    [`theme-slug-${slug}`],
    {
      tags: ['theme', `theme-slug-${slug}`, `restaurant-slug-${slug}`],
      revalidate: 30,
    }
  )

  return getCachedTheme()
}
