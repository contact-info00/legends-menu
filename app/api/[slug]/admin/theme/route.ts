export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession, deleteAdminSession, SessionExpiredError } from '@/lib/auth'
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

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Slug is required' }, { status: 400 })
    }

    // Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    })

    if (!restaurant) {
      return NextResponse.json({ ok: false, error: 'Restaurant not found' }, { status: 404 })
    }

    // Check admin session
    try {
      const session = await requireAdminSession()

      // STRICT session safety: session.restaurantId must match restaurant.id
      if (session.restaurantId !== restaurant.id) {
        console.error(`[SECURITY] Session restaurant mismatch: session restaurantId=${session.restaurantId}, slug restaurantId=${restaurant.id}, slug=${slug}`)
        // Clear session cookie to prevent cross-restaurant access
        await deleteAdminSession()
        return NextResponse.json({ ok: false, error: 'SESSION_RESTAURANT_MISMATCH', message: 'Session restaurant does not match URL restaurant' }, { status: 403 })
      }

      // Use upsert to ensure theme always exists (never fail due to missing theme)
      const theme = await prisma.theme.upsert({
        where: { restaurantId: restaurant.id },
        update: {}, // No update needed if exists
        create: {
          restaurantId: restaurant.id,
          appBg: '#400810', // Default background
        },
      })

      // Safely access new fields that may not exist yet
      const themeResponse = theme as any

      return NextResponse.json(
        {
          ok: true,
          theme: {
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
          },
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      )
    } catch (sessionError) {
      // Handle auth errors
      if (sessionError instanceof SessionExpiredError) {
        await deleteAdminSession()
        return NextResponse.json({ ok: false, error: 'SESSION_EXPIRED' }, { status: 401 })
      }
      const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown error'
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('No admin session') || errorMessage.includes('Session expired')) {
        await deleteAdminSession()
        return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: errorMessage }, { status: 401 })
      }
      throw sessionError
    }
  } catch (error) {
    console.error('Error fetching theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: 'Internal server error', details: errorMessage },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Slug is required' }, { status: 400 })
    }

    // Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    })

    if (!restaurant) {
      return NextResponse.json({ ok: false, error: 'Restaurant not found' }, { status: 404 })
    }

    // Check admin session
    let session
    try {
      session = await requireAdminSession()
    } catch (sessionError) {
      if (sessionError instanceof SessionExpiredError) {
        await deleteAdminSession()
        return NextResponse.json({ ok: false, error: 'SESSION_EXPIRED' }, { status: 401 })
      }
      const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown error'
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('No admin session') || errorMessage.includes('Session expired')) {
        await deleteAdminSession()
        return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: errorMessage }, { status: 401 })
      }
      throw sessionError
    }

    // STRICT session safety: session.restaurantId must match restaurant.id
    if (session.restaurantId !== restaurant.id) {
      console.error(`[SECURITY] Session restaurant mismatch on PUT: session restaurantId=${session.restaurantId}, slug restaurantId=${restaurant.id}, slug=${slug}`)
      // Clear session cookie to prevent cross-restaurant access
      await deleteAdminSession()
      return NextResponse.json({ ok: false, error: 'SESSION_RESTAURANT_MISMATCH', message: 'Session restaurant does not match URL restaurant' }, { status: 403 })
    }

    const body = await request.json()
    const validation = themeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Prepare update data - only include fields that are provided
    const updateData: any = {}

    if (validatedData.appBg !== undefined) {
      updateData.appBg = validatedData.appBg
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

    // Use upsert to ensure theme always exists (never fail due to missing theme)
    const theme = await prisma.theme.upsert({
      where: { restaurantId: restaurant.id }, // Ensures we only update the admin's restaurant theme
      update: updateData, // Update existing theme for this restaurant
      create: {
        restaurantId: restaurant.id, // Create new theme for this restaurant
        appBg: validatedData.appBg || '#400810',
        ...updateData,
      },
    })

    console.log('Theme updated successfully for restaurant:', restaurant.id)

    invalidateRestaurantCaches(restaurant.id, restaurant.slug)

    const themeResponse = theme as any

    return NextResponse.json(
      {
        ok: true,
        theme: {
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
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error saving theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

