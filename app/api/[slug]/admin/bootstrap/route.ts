import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


async function fetchBootstrapData(restaurantId: string) {
  // Fetch all data in parallel
  const [restaurant, uiSettings, settings, theme, sections] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        slug: true,
      },
    }),
    prisma.uiSettings.findUnique({
      where: { restaurantId },
    }).catch(() => null), // Create if doesn't exist
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        slug: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        logoR2Key: true,
        logoR2Url: true,
        logoMediaId: true,
        footerLogoR2Key: true,
        footerLogoR2Url: true,
        footerLogoMediaId: true,
        googleMapsUrl: true,
        phoneNumber: true,
        instagramUrl: true,
        snapchatUrl: true,
        tiktokUrl: true,
        serviceChargePercent: true,
        welcomeTextEn: true,
        welcomeBgR2Key: true,
        welcomeBgR2Url: true,
        welcomeBgMimeType: true,
        welcomeBackgroundMediaId: true,
        welcomeOverlayColor: true,
        welcomeOverlayOpacity: true,
        updatedAt: true,
      },
    }),
    prisma.theme.findUnique({
      where: { restaurantId },
    }).catch(() => null),
    prisma.section.findMany({
      where: {
        restaurantId,
      },
      select: {
        id: true,
        nameEn: true,
        nameKu: true,
        nameAr: true,
        sortOrder: true,
        isActive: true,
        categories: {
          select: {
            id: true,
            nameEn: true,
            nameKu: true,
            nameAr: true,
            sortOrder: true,
            isActive: true,
            _count: {
              select: {
                items: true,
              },
            },
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
  ])

  // Ensure uiSettings exists
  let finalUiSettings = uiSettings
  if (!finalUiSettings) {
    finalUiSettings = await prisma.uiSettings.create({
      data: {
        restaurantId,
        sectionTitleSize: 24,
        categoryTitleSize: 20,
        itemNameSize: 18,
        itemDescriptionSize: 14,
        itemPriceSize: 18,
        headerLogoSize: 24,
        bottomNavSectionSize: 12,
        bottomNavCategorySize: 10,
      },
    })
  }

  // Ensure theme exists
  let finalTheme = theme
  if (!finalTheme) {
    finalTheme = await prisma.theme.create({
      data: {
        restaurantId,
        appBg: '#400810',
      },
    })
  }

  // Transform sections to include item count
  const menuStructure = {
    sections: sections.map((section) => ({
      id: section.id,
      nameEn: section.nameEn,
      nameKu: section.nameKu,
      nameAr: section.nameAr,
      sortOrder: section.sortOrder,
      isActive: section.isActive,
      categories: section.categories.map((category) => ({
        id: category.id,
        nameEn: category.nameEn,
        nameKu: category.nameKu,
        nameAr: category.nameAr,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        itemCount: category._count.items,
      })),
    })),
  }

  return {
    restaurant: {
      id: restaurant!.id,
      slug: restaurant!.slug,
    },
    uiSettings: finalUiSettings,
    settings: settings!,
    theme: finalTheme,
    menuStructure,
  }
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const startTime = Date.now()
  
  try {
    const session = await requireAdminSession()
    
    // Verify slug matches session
    const { prisma } = await import('@/lib/prisma')
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { slug: true },
    })

    if (!restaurant || restaurant.slug !== params.slug) {
      return NextResponse.json(
        { error: 'Restaurant mismatch' },
        { status: 403 }
      )
    }

    const data = await fetchBootstrapData(session.restaurantId)

    const fetchTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] Bootstrap fetch: ${fetchTime}ms`)
    }

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return response
  } catch (error) {
    console.error('Bootstrap error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bootstrap data' },
      { status: 500 }
    )
  }
}
