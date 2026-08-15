import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { MenuTheme } from '@/lib/menu-types'

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

const THEME_SELECT = {
  id: true,
  appBg: true,
  menuBackgroundR2Key: true,
  menuBackgroundR2Url: true,
  itemNameTextColor: true,
  itemPriceTextColor: true,
  itemDescriptionTextColor: true,
  bottomNavSectionNameColor: true,
  categoryNameColor: true,
  headerFooterBgColor: true,
  glassTintColor: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
} as const

async function fetchThemeForSlug(slug: string): Promise<ThemePayload | null> {
  // Resolve the theme through the restaurant relation so the common case is a single query.
  const theme = await prisma.theme.findFirst({
    where: { restaurant: { slug } },
    select: THEME_SELECT,
  })

  if (!theme) {
    // No theme row: only now do we need to tell "restaurant missing" apart from "theme missing".
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    })
    return restaurant ? { theme: { ...DEFAULT_THEME } } : null
  }

  return {
    theme: {
      id: theme.id,
      appBg: theme.appBg,
      menuBackgroundR2Key: theme.menuBackgroundR2Key || null,
      menuBackgroundR2Url: theme.menuBackgroundR2Url || null,
      itemNameTextColor: theme.itemNameTextColor || null,
      itemPriceTextColor: theme.itemPriceTextColor || null,
      itemDescriptionTextColor: theme.itemDescriptionTextColor || null,
      bottomNavSectionNameColor: theme.bottomNavSectionNameColor || null,
      categoryNameColor: theme.categoryNameColor || null,
      headerFooterBgColor: theme.headerFooterBgColor || null,
      glassTintColor: theme.glassTintColor || null,
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

/**
 * Server-side cached theme lookup — shared by /data/theme, [slug]/layout and the menu page.
 *
 * The React cache() wrapper dedupes callers within a single request: a layout and its page render
 * concurrently, so on a cold data cache both would otherwise miss and issue the same query.
 */
export const getCachedThemeForSlug = cache(
  async (slug: string): Promise<ThemePayload | null> => {
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
)

/**
 * Narrow the cached theme payload to the fields the customer menu renders.
 * A restaurant without a Theme row yields the id-less DEFAULT_THEME, which maps to null so the
 * menu keeps falling back to its built-in defaults exactly as before.
 */
export function toMenuTheme(payload: ThemePayload | null): MenuTheme | null {
  const theme = payload?.theme
  if (!theme?.id) {
    return null
  }

  return {
    appBg: theme.appBg,
    menuBackgroundR2Url: theme.menuBackgroundR2Url ?? null,
    headerFooterBgColor: theme.headerFooterBgColor ?? null,
    glassTintColor: theme.glassTintColor ?? null,
    itemNameTextColor: theme.itemNameTextColor ?? null,
    itemPriceTextColor: theme.itemPriceTextColor ?? null,
    itemDescriptionTextColor: theme.itemDescriptionTextColor ?? null,
    bottomNavSectionNameColor: theme.bottomNavSectionNameColor ?? null,
    categoryNameColor: theme.categoryNameColor ?? null,
  }
}
