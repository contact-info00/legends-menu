import { prisma } from '@/lib/prisma'

export interface RestaurantData {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  logoMediaId: string | null
  logo: {
    id: string
    mimeType: string
    size: number
  } | null
  footerLogoMediaId: string | null
  footerLogo: {
    id: string
    mimeType: string
    size: number
  } | null
  welcomeBackgroundMediaId: string | null
  welcomeBackground: {
    id: string
    mimeType: string
    size: number
  } | null
  // R2 fields
  logoR2Key?: string | null
  logoR2Url?: string | null
  footerLogoR2Key?: string | null
  footerLogoR2Url?: string | null
  welcomeBgR2Key?: string | null
  welcomeBgR2Url?: string | null
  welcomeBgMimeType?: string | null
  welcomeOverlayColor: string
  welcomeOverlayOpacity: number
  welcomeTextEn: string | null
  googleMapsUrl: string | null
  phoneNumber: string | null
  instagramUrl: string | null
  snapchatUrl: string | null
  tiktokUrl: string | null
  serviceChargePercent: number | null
  brandColors: any
  updatedAt: Date
}

export async function getRestaurantData(slug: string): Promise<RestaurantData | null> {
  try {
    let restaurant: any = null
    
    try {
      restaurant = await prisma.restaurant.findUnique({
        where: { slug },
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
    } catch (error: any) {
      // If footerLogo relation fails or column doesn't exist, retry without it
      if (error?.message?.includes('footerLogo') || error?.code === 'P2021' || error?.code === 'P2022') {
        try {
          restaurant = await prisma.restaurant.findUnique({
            where: { slug },
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
          // If still fails (e.g., missing columns), use raw SQL as fallback
          // Only select columns that definitely exist (core columns)
          console.warn('[DB COMPAT] Prisma query failed, using raw SQL fallback:', retryError)
          const rawResult = await prisma.$queryRawUnsafe<any[]>(
            `SELECT 
              id, "nameKu", "nameEn", "nameAr",
              "logoMediaId", "footerLogoMediaId", "welcomeBackgroundMediaId",
              "welcomeOverlayColor", "welcomeOverlayOpacity", "welcomeTextEn",
              "googleMapsUrl", "phoneNumber", "brandColors", "updatedAt",
              "logoR2Key", "logoR2Url", "footerLogoR2Key", "footerLogoR2Url",
              "welcomeBgR2Key", "welcomeBgR2Url", "welcomeBgMimeType"
            FROM "Restaurant"
            WHERE slug = '${slug.replace(/'/g, "''")}'`
          )
          if (rawResult && rawResult.length > 0) {
            restaurant = rawResult[0]
            // Set default values for columns that might not exist yet
            restaurant.instagramUrl = null
            restaurant.snapchatUrl = null
            restaurant.tiktokUrl = null
            restaurant.serviceChargePercent = 0
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
            return null
          }
        }
      } else {
        throw error
      }
    }

    if (!restaurant) {
      return null
    }

    const restaurantData = restaurant as any
    const footerLogoMediaId = restaurantData.footerLogoMediaId || null
    const footerLogo = restaurantData.footerLogo || null

    // Safely access R2 fields - may not exist if migration hasn't run
    const getR2Field = (fieldName: string) => {
      try {
        return restaurantData[fieldName] || null
      } catch {
        return null
      }
    }

    return {
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
      // R2 fields - safely accessed
      logoR2Key: getR2Field('logoR2Key'),
      logoR2Url: getR2Field('logoR2Url'),
      footerLogoR2Key: getR2Field('footerLogoR2Key'),
      footerLogoR2Url: getR2Field('footerLogoR2Url'),
      welcomeBgR2Key: getR2Field('welcomeBgR2Key'),
      welcomeBgR2Url: getR2Field('welcomeBgR2Url'),
      welcomeBgMimeType: getR2Field('welcomeBgMimeType'),
      welcomeOverlayColor: restaurant.welcomeOverlayColor,
      welcomeOverlayOpacity: restaurant.welcomeOverlayOpacity,
      welcomeTextEn: restaurant.welcomeTextEn,
      googleMapsUrl: restaurant.googleMapsUrl,
      phoneNumber: restaurant.phoneNumber,
      instagramUrl: restaurantData.instagramUrl || null,
      snapchatUrl: restaurantData.snapchatUrl || null,
      tiktokUrl: restaurantData.tiktokUrl || null,
      serviceChargePercent: restaurantData.serviceChargePercent || 0,
      brandColors: restaurant.brandColors,
      updatedAt: restaurant.updatedAt,
    }
  } catch (error: any) {
    console.error('Error fetching restaurant data:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    })
    return null
  }
}

