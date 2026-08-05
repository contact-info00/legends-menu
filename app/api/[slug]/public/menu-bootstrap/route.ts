import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

// Cached at runtime via unstable_cache + Cache-Control headers (not static route generation).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper function to fetch bootstrap data (will be cached)
async function fetchBootstrapData(restaurantId: string) {
  const [theme, sectionsWithCategories, uiSettings] = await Promise.all([
    // Get theme (for menu background and colors)
    prisma.theme.findUnique({
      where: { restaurantId },
      select: {
        menuBackgroundR2Url: true,
        headerFooterBgColor: true,
        glassTintColor: true,
        itemNameTextColor: true,
        itemPriceTextColor: true,
        itemDescriptionTextColor: true,
        bottomNavSectionNameColor: true,
        categoryNameColor: true,
      },
    }),
    // Get sections with categories (without items for faster load)
    prisma.section.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        sortOrder: true,
        isActive: true,
        categories: {
          where: {
            isActive: true, // restaurantId already filtered by parent query
          },
          select: {
            id: true,
            nameKu: true,
            nameEn: true,
            nameAr: true,
            sortOrder: true,
            isActive: true,
            imageR2Url: true,
            imageMediaId: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    }),
    // Get UI settings (typography sizes and currency)
    (async () => {
      try {
        const settings = await prisma.uiSettings.findUnique({
          where: { restaurantId },
        })
        if (settings) {
          return {
            sectionTitleSize: settings.sectionTitleSize ?? 22,
            categoryTitleSize: settings.categoryTitleSize ?? 16,
            itemNameSize: settings.itemNameSize ?? 14,
            itemDescriptionSize: settings.itemDescriptionSize ?? 14,
            itemPriceSize: settings.itemPriceSize ?? 16,
            headerLogoSize: settings.headerLogoSize ?? 32,
            bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? 13,
            bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? 13,
            currency: ((settings as any).currency === 'IQD' || (settings as any).currency === 'USD') 
              ? (settings as any).currency 
              : 'IQD',
          }
        }
        // Return defaults if no settings found
        return {
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
      } catch (error) {
        // If query fails (e.g., column doesn't exist), return defaults
        console.warn('Error fetching UI settings from bootstrap:', error)
        return {
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
      }
    })(),
  ])

  return { theme, sectionsWithCategories, uiSettings }
}

// Cached version of fetchBootstrapData
// Note: unstable_cache needs to be called at module level, so we'll call it in the route handler

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        logoR2Url: true,
        logoMediaId: true,
        serviceChargePercent: true,
        // Welcome page fields
        welcomeBgR2Url: true,
        welcomeBgMimeType: true,
        welcomeOverlayColor: true,
        welcomeOverlayOpacity: true,
        welcomeTextEn: true,
        googleMapsUrl: true,
        phoneNumber: true,
        instagramUrl: true,
        snapchatUrl: true,
        tiktokUrl: true,
        welcomeBackgroundMediaId: true,
        updatedAt: true,
      },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    }

    // OPTIMIZATION #2: Use cached function for related data
    const cachedFetch = unstable_cache(
      async () => fetchBootstrapData(restaurant.id),
      [`menu-bootstrap-${restaurant.id}`],
      {
        tags: ['menu-bootstrap', `restaurant-${restaurant.id}`],
        revalidate: 30, // Cache for 30 seconds
      }
    )
    const { theme, sectionsWithCategories, uiSettings } = await cachedFetch()

    // Return bootstrap data (basic info + structure, no items)
    return NextResponse.json(
      {
        restaurant: {
          id: restaurant.id,
          nameKu: restaurant.nameKu,
          nameEn: restaurant.nameEn,
          nameAr: restaurant.nameAr,
          logoR2Url: restaurant.logoR2Url,
          logoMediaId: restaurant.logoMediaId,
          serviceChargePercent: restaurant.serviceChargePercent ?? 0,
          // Welcome page fields (optional, menu page ignores these)
          welcomeBgR2Url: (restaurant as any).welcomeBgR2Url || null,
          welcomeBgMimeType: (restaurant as any).welcomeBgMimeType || null,
          welcomeOverlayColor: (restaurant as any).welcomeOverlayColor || null,
          welcomeOverlayOpacity: (restaurant as any).welcomeOverlayOpacity ?? null,
          welcomeTextEn: (restaurant as any).welcomeTextEn || null,
          googleMapsUrl: (restaurant as any).googleMapsUrl || null,
          phoneNumber: (restaurant as any).phoneNumber || null,
          instagramUrl: (restaurant as any).instagramUrl || null,
          snapchatUrl: (restaurant as any).snapchatUrl || null,
          tiktokUrl: (restaurant as any).tiktokUrl || null,
          welcomeBackgroundMediaId: (restaurant as any).welcomeBackgroundMediaId || null,
          updatedAt: (restaurant as any).updatedAt ? new Date((restaurant as any).updatedAt).toISOString() : null,
        },
        theme: theme ? {
          menuBackgroundR2Url: theme.menuBackgroundR2Url,
          headerFooterBgColor: theme.headerFooterBgColor,
          glassTintColor: theme.glassTintColor,
          itemNameTextColor: theme.itemNameTextColor,
          itemPriceTextColor: theme.itemPriceTextColor,
          itemDescriptionTextColor: theme.itemDescriptionTextColor,
          bottomNavSectionNameColor: theme.bottomNavSectionNameColor,
          categoryNameColor: theme.categoryNameColor,
        } : null,
        sections: sectionsWithCategories || [],
        uiSettings: uiSettings || {
          sectionTitleSize: 22,
          categoryTitleSize: 16,
          itemNameSize: 14,
          itemDescriptionSize: 14,
          itemPriceSize: 16,
          headerLogoSize: 32,
          bottomNavSectionSize: 13,
          bottomNavCategorySize: 13,
          currency: 'IQD',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching menu bootstrap:', error)
    // Return minimal defaults on error
    return NextResponse.json(
      {
        restaurant: null,
        theme: null,
        sections: [],
        uiSettings: {
          sectionTitleSize: 22,
          categoryTitleSize: 16,
          itemNameSize: 14,
          itemDescriptionSize: 14,
          itemPriceSize: 16,
          headerLogoSize: 32,
          bottomNavSectionSize: 13,
          bottomNavCategorySize: 13,
          currency: 'IQD',
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache',
        },
      }
    )
  }
}
