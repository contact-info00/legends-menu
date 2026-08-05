import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export const revalidate = 300
export const runtime = 'nodejs'


// Load fallback data from database (updated by admin panel)
const getFallbackData = async (slug: string) => {
  try {
    // Try to read from database first (simple query, no relations)
    const fallbackSettings = await prisma.fallbackSettings.findUnique({
      where: { id: 'fallback-1' },
    })
    
    if (fallbackSettings) {
      return {
        id: 'fallback',
        nameKu: fallbackSettings.nameKu,
        nameEn: fallbackSettings.nameEn,
        nameAr: fallbackSettings.nameAr,
        logoMediaId: fallbackSettings.logoMediaId,
        footerLogoMediaId: fallbackSettings.footerLogoMediaId,
        logo: null,
        footerLogo: null,
        welcomeBackgroundMediaId: fallbackSettings.welcomeBackgroundMediaId,
        welcomeBackground: null,
        welcomeOverlayColor: fallbackSettings.welcomeOverlayColor,
        welcomeOverlayOpacity: fallbackSettings.welcomeOverlayOpacity,
        welcomeTextEn: fallbackSettings.welcomeTextEn,
        googleMapsUrl: fallbackSettings.googleMapsUrl,
        phoneNumber: fallbackSettings.phoneNumber,
        brandColors: (fallbackSettings.brandColors as any) || {
          menuGradientStart: '#5C0015',
          menuGradientEnd: '#800020',
          headerText: '#FFFFFF',
          headerIcons: '#FFFFFF',
          activeTab: '#FFFFFF',
          inactiveTab: '#CCCCCC',
          categoryCardBg: '#4A5568',
          itemCardBg: '#4A5568',
          itemNameText: '#FFFFFF',
          itemDescText: '#E2E8F0',
          priceText: '#FBBF24',
          dividerLine: '#718096',
          modalBg: '#2D3748',
          modalOverlay: 'rgba(0,0,0,0.7)',
          buttonBg: '#800020',
          buttonText: '#FFFFFF',
          feedbackCardBg: '#4A5568',
          feedbackCardText: '#FFFFFF',
          welcomeOverlayColor: '#000000',
          welcomeOverlayOpacity: 0.5,
        },
        updatedAt: new Date().toISOString(),
      }
    }
  } catch (error) {
    // If database query fails, continue to hardcoded defaults
    console.warn('Could not read fallback settings from database, using hardcoded defaults:', error)
  }
  
  // Hardcoded defaults (only used if database is completely unavailable)
  return {
    id: 'fallback',
    nameKu: 'رێستۆرانتی',
    nameEn: 'Restaurant',
    nameAr: 'مطعم',
    logoMediaId: null,
    logo: null,
    footerLogoMediaId: null,
    footerLogo: null,
    welcomeBackgroundMediaId: null,
    welcomeBackground: null,
    welcomeOverlayColor: '#000000',
    welcomeOverlayOpacity: 0.5,
    welcomeTextEn: null,
    googleMapsUrl: null,
    phoneNumber: null,
    brandColors: {
      menuGradientStart: '#5C0015',
      menuGradientEnd: '#800020',
      headerText: '#FFFFFF',
      headerIcons: '#FFFFFF',
      activeTab: '#FFFFFF',
      inactiveTab: '#CCCCCC',
      categoryCardBg: '#4A5568',
      itemCardBg: '#4A5568',
      itemNameText: '#FFFFFF',
      itemDescText: '#E2E8F0',
      priceText: '#FBBF24',
      dividerLine: '#718096',
      modalBg: '#2D3748',
      modalOverlay: 'rgba(0,0,0,0.7)',
      buttonBg: '#800020',
      buttonText: '#FFFFFF',
      feedbackCardBg: '#4A5568',
      feedbackCardText: '#FFFFFF',
      welcomeOverlayColor: '#000000',
      welcomeOverlayOpacity: 0.5,
    },
    updatedAt: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  // Check environment variables
  if (!process.env.DATABASE_URL) {
    console.error('[ERROR] DATABASE_URL environment variable is not set')
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug') || 'legends-restaurant'
    const fallbackData = await getFallbackData(slug)
    return NextResponse.json(fallbackData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'X-Fallback': 'true',
      },
    })
  }

  try {
    // Require slug parameter - no fallback
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 })
    }

    // Remove debug logging in production to avoid exposing sensitive info
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] /data/restaurant - Received slug:', slug)
    }

    // Helper function to fetch restaurant data (will be cached)
    async function fetchRestaurantData(slugParam: string): Promise<any> {
      // Query by slug - no fallback to first restaurant
      // Try to include footerLogo, but handle gracefully if column doesn't exist
      let restaurant: any = null
      try {
        // Set a timeout for database queries to handle slow connections (5 seconds)
        const queryPromise = prisma.restaurant.findUnique({
          where: { slug: slugParam },
          include: {
            logo: {
              select: {
                id: true,
                mimeType: true,
                size: true,
              },
            },
            footerLogo: {
              select: {
                id: true,
                mimeType: true,
                size: true,
              },
            },
            welcomeBackground: {
              select: {
                id: true,
                mimeType: true,
                size: true,
              },
            },
          },
        })

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        })

        restaurant = await Promise.race([queryPromise, timeoutPromise]) as any
      } catch (error: any) {
        // If footerLogo relation fails (column doesn't exist) or missing columns (P2022), retry without footerLogo
        if (error?.message?.includes('footerLogo') || error?.code === 'P2021' || error?.code === 'P2022') {
          console.warn('[DB COMPAT] Column not found, querying without footerLogo:', error.message)
          try {
            restaurant = await prisma.restaurant.findUnique({
              where: { slug: slugParam },
              include: {
                logo: {
                  select: {
                    id: true,
                    mimeType: true,
                    size: true,
                  },
                },
                welcomeBackground: {
                  select: {
                    id: true,
                    mimeType: true,
                    size: true,
                  },
                },
              },
            })
          } catch (retryError: any) {
            // If still fails (e.g., missing social media columns), use raw SQL fallback
            // Only select columns that definitely exist (core columns)
            console.warn('[DB COMPAT] Prisma query failed, using raw SQL fallback:', retryError)
            // Try to select serviceChargePercent if column exists, otherwise default to 0
            let rawResult: any[] | null = null
            try {
              rawResult = await prisma.$queryRawUnsafe<any[]>(
                `SELECT 
                  id, "nameKu", "nameEn", "nameAr",
                  "logoMediaId", "footerLogoMediaId", "welcomeBackgroundMediaId",
                  "welcomeOverlayColor", "welcomeOverlayOpacity", "welcomeTextEn",
                  "googleMapsUrl", "phoneNumber", "brandColors", "updatedAt",
                  "logoR2Key", "logoR2Url", "footerLogoR2Key", "footerLogoR2Url",
                  "welcomeBgR2Key", "welcomeBgR2Url", "welcomeBgMimeType",
                  COALESCE("instagramUrl", NULL) as "instagramUrl",
                  COALESCE("snapchatUrl", NULL) as "snapchatUrl",
                  COALESCE("tiktokUrl", NULL) as "tiktokUrl",
                  COALESCE("serviceChargePercent", 0) as "serviceChargePercent"
                FROM "Restaurant"
                WHERE slug = '${slugParam.replace(/'/g, "''")}'`
              )
            } catch (sqlError: any) {
              // If serviceChargePercent column doesn't exist, select without it
              if (sqlError?.message?.includes('serviceChargePercent') || sqlError?.message?.includes('instagramUrl') || sqlError?.code === '42703') {
                rawResult = await prisma.$queryRawUnsafe<any[]>(
                  `SELECT 
                    id, "nameKu", "nameEn", "nameAr",
                    "logoMediaId", "footerLogoMediaId", "welcomeBackgroundMediaId",
                    "welcomeOverlayColor", "welcomeOverlayOpacity", "welcomeTextEn",
                    "googleMapsUrl", "phoneNumber", "brandColors", "updatedAt",
                    "logoR2Key", "logoR2Url", "footerLogoR2Key", "footerLogoR2Url",
                    "welcomeBgR2Key", "welcomeBgR2Url", "welcomeBgMimeType"
                  FROM "Restaurant"
                  WHERE slug = '${slugParam.replace(/'/g, "''")}'`
                )
              } else {
                throw sqlError
              }
            }
            
            if (rawResult && rawResult.length > 0) {
              restaurant = rawResult[0]
              // Set default values for columns that might not exist yet
              restaurant.instagramUrl = restaurant.instagramUrl ?? null
              restaurant.snapchatUrl = restaurant.snapchatUrl ?? null
              restaurant.tiktokUrl = restaurant.tiktokUrl ?? null
              restaurant.serviceChargePercent = restaurant.serviceChargePercent ?? 0
              // Fetch related media separately
              if (restaurant.logoMediaId) {
                try {
                  const logo = await prisma.media.findUnique({
                    where: { id: restaurant.logoMediaId },
                    select: { id: true, mimeType: true, size: true },
                  })
                  restaurant.logo = logo
                } catch {
                  restaurant.logo = null
                }
              }
              if (restaurant.footerLogoMediaId) {
                try {
                  const footerLogo = await prisma.media.findUnique({
                    where: { id: restaurant.footerLogoMediaId },
                    select: { id: true, mimeType: true, size: true },
                  })
                  restaurant.footerLogo = footerLogo
                } catch {
                  restaurant.footerLogo = null
                }
              }
              if (restaurant.welcomeBackgroundMediaId) {
                try {
                  const welcomeBg = await prisma.media.findUnique({
                    where: { id: restaurant.welcomeBackgroundMediaId },
                    select: { id: true, mimeType: true, size: true },
                  })
                  restaurant.welcomeBackground = welcomeBg
                } catch {
                  restaurant.welcomeBackground = null
                }
              }
            } else {
              restaurant = null
            }
          }
        } else {
          // If it's a timeout or connection error, throw to be handled outside
          if (error?.message?.includes('timeout') || error?.code === 'P1001' || error?.code === 'P1002') {
            throw error
          }
          throw error
        }
      }
      
      return restaurant
    }

    // Use cached function to fetch restaurant data
    const cachedFetch = unstable_cache(
      async () => fetchRestaurantData(slug),
      [`restaurant-data-slug-${slug}`],
      {
        tags: ['restaurant-data', 'settings', `restaurant-slug-${slug}`, `restaurant-data-slug-${slug}`],
        revalidate: 300, // Cache for 5 minutes
      }
    )

    let restaurant: any = null
    try {
      restaurant = await cachedFetch()
    } catch (error: any) {
      // If it's a timeout or connection error, return fallback
      if (error?.message?.includes('timeout') || error?.code === 'P1001' || error?.code === 'P1002') {
        console.warn('[WARN] Database connection issue, returning fallback data:', error.message)
        const fallbackData = await getFallbackData(slug)
        return NextResponse.json(fallbackData, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'X-Fallback': 'true',
          },
        })
      }
      throw error
    }

    // Return 404 if restaurant doesn't exist (deleted restaurants should not work)
    // Do NOT auto-create restaurants - they must be created explicitly via super admin
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found', slug },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    }

    // Safely access footerLogoMediaId and footerLogo - may not exist if migration hasn't run
    const footerLogoMediaId = (restaurant as any).footerLogoMediaId || null
    const footerLogo = (restaurant as any).footerLogo || null

    return NextResponse.json(
      {
        id: restaurant.id,
        nameKu: restaurant.nameKu,
        nameEn: restaurant.nameEn,
        nameAr: restaurant.nameAr,
        logoMediaId: restaurant.logoMediaId,
        logo: restaurant.logo,
        footerLogoMediaId: footerLogoMediaId,
        footerLogo: footerLogo,
        welcomeBackgroundMediaId: restaurant.welcomeBackgroundMediaId,
        welcomeBackground: restaurant.welcomeBackground,
        // R2 fields
        logoR2Key: (restaurant as any).logoR2Key || null,
        logoR2Url: (restaurant as any).logoR2Url || null,
        footerLogoR2Key: (restaurant as any).footerLogoR2Key || null,
        footerLogoR2Url: (restaurant as any).footerLogoR2Url || null,
        welcomeBgR2Key: (restaurant as any).welcomeBgR2Key || null,
        welcomeBgR2Url: (restaurant as any).welcomeBgR2Url || null,
        welcomeOverlayColor: restaurant.welcomeOverlayColor,
        welcomeOverlayOpacity: restaurant.welcomeOverlayOpacity,
        welcomeTextEn: restaurant.welcomeTextEn,
        googleMapsUrl: restaurant.googleMapsUrl,
        phoneNumber: restaurant.phoneNumber,
        instagramUrl: (restaurant as any).instagramUrl || null,
        snapchatUrl: (restaurant as any).snapchatUrl || null,
        tiktokUrl: (restaurant as any).tiktokUrl || null,
        serviceChargePercent: (restaurant as any).serviceChargePercent != null ? Number((restaurant as any).serviceChargePercent) : 0,
        brandColors: restaurant.brandColors,
        updatedAt: restaurant.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error: unknown) {
    // Log full error details on server (never expose to client)
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : { message: 'Unknown error', error }
    console.error('[ERROR] Error fetching restaurant:', errorDetails)

    // Return 404 if restaurant doesn't exist (deleted)
    // Do NOT return fallback data - deleted restaurants should return 404
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')
    return NextResponse.json(
      { error: 'Restaurant not found', slug: slug || null },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  }
}

