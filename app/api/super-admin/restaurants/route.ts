export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminSession } from '@/lib/auth'
import { validateSlug } from '@/lib/restaurant-utils'
import { z } from 'zod'

const createRestaurantSchema = z.object({
  slug: z.string().min(1),
  nameEn: z.string().min(1),
  nameKu: z.string().optional(),
  nameAr: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameKu: true,
        nameAr: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ restaurants })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createRestaurantSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { slug, nameEn, nameKu, nameAr } = validation.data

    // Validate slug format
    const slugValidation = validateSlug(slug)
    if (!slugValidation.valid) {
      return NextResponse.json(
        { error: slugValidation.error },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existing = await prisma.restaurant.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A restaurant with this slug already exists' },
        { status: 400 }
      )
    }

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        slug,
        nameEn,
        nameKu: nameKu || nameEn,
        nameAr: nameAr || nameEn,
      },
    })

    // Create default UI settings for the restaurant
    await prisma.uiSettings.create({
      data: {
        restaurantId: restaurant.id,
        sectionTitleSize: 22,
        categoryTitleSize: 16,
        itemNameSize: 14,
        itemDescriptionSize: 14,
        itemPriceSize: 16,
        headerLogoSize: 32,
        bottomNavSectionSize: 13,
        bottomNavCategorySize: 13,
      },
    })

    // Create default theme for the restaurant (neutral default)
    await prisma.theme.create({
      data: {
        restaurantId: restaurant.id,
        appBg: '#FFFFFF', // Neutral white background for new restaurants
      },
    })

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        nameEn: restaurant.nameEn,
        nameKu: restaurant.nameKu,
        nameAr: restaurant.nameAr,
      },
    })
  } catch (error: any) {
    console.error('Error creating restaurant:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A restaurant with this slug already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

