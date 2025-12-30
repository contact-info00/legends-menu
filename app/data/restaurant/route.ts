import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Require slug parameter - no fallback
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 })
    }

    // Retry logic for database queries
    let restaurant
    let retries = 0
    const maxRetries = 3
    
    while (retries < maxRetries) {
      try {
        // Query by slug - no fallback to first restaurant
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
        break // Success, exit retry loop
      } catch (dbError: any) {
        retries++
        // If it's a connection pool error, wait and retry
        if (dbError?.code === 'P1001' || dbError?.message?.includes('MaxClients') || dbError?.message?.includes('connection')) {
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * retries)) // Exponential backoff
            continue
          }
        }
        throw dbError // Re-throw if not a connection error or max retries reached
      }
    }

    // Auto-create "legends-restaurant" if it doesn't exist (only for this specific slug)
    if (!restaurant && slug === 'legends-restaurant') {
      try {
        restaurant = await prisma.restaurant.upsert({
        where: { slug: 'legends-restaurant' },
        update: {},
        create: {
          slug: 'legends-restaurant',
          nameKu: 'رێستۆرانتی لێجەندز',
          nameEn: 'Legends Restaurant',
          nameAr: 'مطعم الأساطير',
          googleMapsUrl: 'https://maps.google.com',
          phoneNumber: '+9647501234567',
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
        },
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
      } catch (upsertError: any) {
        // If upsert fails due to connection, try one more time
        if (upsertError?.code === 'P1001' || upsertError?.message?.includes('MaxClients') || upsertError?.message?.includes('connection')) {
          await new Promise(resolve => setTimeout(resolve, 200))
          restaurant = await prisma.restaurant.upsert({
            where: { slug: 'legends-restaurant' },
            update: {},
            create: {
              slug: 'legends-restaurant',
              nameKu: 'رێستۆرانتی لێجەندز',
              nameEn: 'Legends Restaurant',
              nameAr: 'مطعم الأساطير',
              googleMapsUrl: 'https://maps.google.com',
              phoneNumber: '+9647501234567',
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
            },
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
        } else {
          throw upsertError
        }
      }
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found for slug: ' + slug }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: restaurant.id,
        nameKu: restaurant.nameKu,
        nameEn: restaurant.nameEn,
        nameAr: restaurant.nameAr,
        logoMediaId: restaurant.logoMediaId,
        logo: restaurant.logo,
        welcomeBackgroundMediaId: restaurant.welcomeBackgroundMediaId,
        welcomeBackground: restaurant.welcomeBackground,
        welcomeOverlayColor: restaurant.welcomeOverlayColor,
        welcomeOverlayOpacity: restaurant.welcomeOverlayOpacity,
        welcomeTextEn: restaurant.welcomeTextEn,
        googleMapsUrl: restaurant.googleMapsUrl,
        phoneNumber: restaurant.phoneNumber,
        brandColors: restaurant.brandColors,
        updatedAt: restaurant.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

