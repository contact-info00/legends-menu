import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const restaurant = await prisma.restaurant.findUnique({
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

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: restaurant.id,
        slug: restaurant.slug,
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
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching restaurant by slug:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

