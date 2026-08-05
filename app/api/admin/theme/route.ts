export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateRestaurantCaches } from '@/lib/cache-invalidation'
import { z } from 'zod'

const themeSchema = z.object({
  appBg: z.string().optional(),
  menuBackgroundR2Key: z.string().nullable().optional(),
  menuBackgroundR2Url: z.string().nullable().optional(),
  itemNameTextColor: z.string().nullable().optional(),
  itemPriceTextColor: z.string().nullable().optional(),
  itemDescriptionTextColor: z.string().nullable().optional(),
  bottomNavSectionNameColor: z.string().nullable().optional(),
  categoryNameColor: z.string().nullable().optional(),
  headerFooterBgColor: z.string().nullable().optional(),
  glassTintColor: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const session = await requireAdminSession()

    // Get restaurant by session restaurantId to get its slug
    // Select only needed fields for better performance
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { id: true, slug: true },
    })
    
    if (!restaurant) {
      return NextResponse.json({ error: 'SESSION_RESTAURANT_MISMATCH', message: 'Restaurant not found for session' }, { status: 403 })
    }

    // Validate slug parameter matches session restaurant (if provided)
    const { searchParams } = new URL(request.url)
    const slugParam = searchParams.get('slug')
    
    if (slugParam && restaurant.slug !== slugParam) {
      console.error(`[SECURITY] Session restaurant mismatch: session slug=${restaurant.slug}, URL slug=${slugParam}`)
      return NextResponse.json({ error: 'SESSION_RESTAURANT_MISMATCH', message: 'Session restaurant does not match URL restaurant' }, { status: 403 })
    }

    // Get theme - select only needed fields
    let theme = await prisma.theme.findUnique({
      where: { restaurantId: session.restaurantId },
      select: {
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
      },
    })

    // If theme doesn't exist, create it with neutral defaults (don't cache creation)
    if (!theme) {
      theme = await prisma.theme.create({
        data: {
          restaurantId: session.restaurantId,
          appBg: '#400810', // Default background
        },
      })
    }

    const fetchTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] Theme fetch: ${fetchTime}ms`)
    }

    return NextResponse.json(
      { theme: {
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
      } },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific auth errors
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('No admin session')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: errorMessage },
        { status: 401 }
      )
    }
    
    if (errorMessage.includes('Restaurant not found')) {
      return NextResponse.json(
        { error: 'SESSION_RESTAURANT_MISMATCH', message: errorMessage },
        { status: 403 }
      )
    }
    
    // Only return 500 for unexpected errors
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    // Get restaurant by session restaurantId to get its slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: { id: true, slug: true },
    })
    
    if (!restaurant) {
      return NextResponse.json({ error: 'SESSION_RESTAURANT_MISMATCH', message: 'Restaurant not found for session' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate slug if provided in body
    if (body.slug && restaurant.slug !== body.slug) {
      console.error(`[SECURITY] Session restaurant mismatch on PUT: session slug=${restaurant.slug}, body slug=${body.slug}`)
      return NextResponse.json({ error: 'SESSION_RESTAURANT_MISMATCH', message: 'Session restaurant does not match request restaurant' }, { status: 403 })
    }
    
    const validation = themeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Get existing theme to preserve fields not being updated
    const existingTheme = await prisma.theme.findUnique({
      where: { restaurantId: session.restaurantId },
    })

    // Prepare update data - only include fields that are provided
    const updateData: any = {}
    
    if (validatedData.appBg !== undefined) {
      updateData.appBg = validatedData.appBg
    } else if (!existingTheme) {
      updateData.appBg = '#400810' // Default if creating new
    }
    
    if (validatedData.menuBackgroundR2Key !== undefined) {
      updateData.menuBackgroundR2Key = validatedData.menuBackgroundR2Key
    }
    if (validatedData.menuBackgroundR2Url !== undefined) {
      updateData.menuBackgroundR2Url = validatedData.menuBackgroundR2Url
    }
    if (validatedData.itemNameTextColor !== undefined) {
      updateData.itemNameTextColor = validatedData.itemNameTextColor
    }
    if (validatedData.itemPriceTextColor !== undefined) {
      updateData.itemPriceTextColor = validatedData.itemPriceTextColor
    }
    if (validatedData.itemDescriptionTextColor !== undefined) {
      updateData.itemDescriptionTextColor = validatedData.itemDescriptionTextColor
    }
    if (validatedData.bottomNavSectionNameColor !== undefined) {
      updateData.bottomNavSectionNameColor = validatedData.bottomNavSectionNameColor
    }
    if (validatedData.categoryNameColor !== undefined) {
      updateData.categoryNameColor = validatedData.categoryNameColor
    }
    if (validatedData.headerFooterBgColor !== undefined) {
      updateData.headerFooterBgColor = validatedData.headerFooterBgColor
    }
    if (validatedData.glassTintColor !== undefined) {
      updateData.glassTintColor = validatedData.glassTintColor
    }

    // Upsert theme for THIS restaurant only (restaurantId from session)
    const theme = await prisma.theme.upsert({
      where: { restaurantId: session.restaurantId }, // Ensures we only update the admin's restaurant theme
      update: updateData, // Update existing theme for this restaurant
      create: {
        restaurantId: session.restaurantId, // Create new theme for this restaurant
        appBg: validatedData.appBg || '#400810',
        ...updateData,
      },
    })

    console.log('Theme updated successfully for restaurant:', session.restaurantId)

    invalidateRestaurantCaches(session.restaurantId, restaurant.slug)

    const themeResponse = theme as any

    return NextResponse.json(
      { theme: {
        id: theme.id,
        appBg: theme.appBg,
        menuBackgroundR2Key: themeResponse.menuBackgroundR2Key || null,
        menuBackgroundR2Url: themeResponse.menuBackgroundR2Url || null,
        itemNameTextColor: themeResponse.itemNameTextColor || null,
        itemPriceTextColor: themeResponse.itemPriceTextColor || null,
        itemDescriptionTextColor: themeResponse.itemDescriptionTextColor || null,
        bottomNavSectionNameColor: themeResponse.bottomNavSectionNameColor || null,
        categoryNameColor: themeResponse.categoryNameColor || null,
        headerFooterBgColor: themeResponse.headerFooterBgColor || null,
        glassTintColor: themeResponse.glassTintColor || null,
        restaurantId: theme.restaurantId,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      }, success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error saving theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific auth errors
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('No admin session')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: errorMessage },
        { status: 401 }
      )
    }
    
    if (errorMessage.includes('Restaurant not found')) {
      return NextResponse.json(
        { error: 'SESSION_RESTAURANT_MISMATCH', message: errorMessage },
        { status: 403 }
      )
    }
    
    // Only return 500 for unexpected errors
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

