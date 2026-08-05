export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminSession } from '@/lib/auth'
import { deleteR2Object, deleteR2ObjectsByPrefix } from '@/lib/r2-client'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verify super admin authentication
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = params

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Prevent deletion of reserved slugs
    const reservedSlugs = ['super-admin', 'admin', 'api', 'auth', 'login']
    if (reservedSlugs.includes(slug)) {
      return NextResponse.json(
        { error: 'Cannot delete reserved restaurant slug' },
        { status: 400 }
      )
    }

    // Fetch the restaurant with all related data to collect R2 keys
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        logoR2Key: true,
        footerLogoR2Key: true,
        welcomeBgR2Key: true,
        sections: {
          select: {
            id: true,
            categories: {
              select: {
                id: true,
                imageR2Key: true,
                items: {
                  select: {
                    id: true,
                    imageR2Key: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    console.log(`[RESTAURANT DELETE] Starting deletion for restaurant: ${slug} (${restaurant.id})`)

    // Collect all R2 keys to delete
    const r2KeysToDelete: string[] = []

    // Restaurant-level media
    if (restaurant.logoR2Key) r2KeysToDelete.push(restaurant.logoR2Key)
    if (restaurant.footerLogoR2Key) r2KeysToDelete.push(restaurant.footerLogoR2Key)
    if (restaurant.welcomeBgR2Key) r2KeysToDelete.push(restaurant.welcomeBgR2Key)

    // Category images
    for (const section of restaurant.sections) {
      for (const category of section.categories) {
        if (category.imageR2Key) {
          r2KeysToDelete.push(category.imageR2Key)
        }
        // Item images
        for (const item of category.items) {
          if (item.imageR2Key) {
            r2KeysToDelete.push(item.imageR2Key)
          }
        }
      }
    }

    // Delete all individual R2 files
    console.log(`[RESTAURANT DELETE] Deleting ${r2KeysToDelete.length} R2 files...`)
    for (const key of r2KeysToDelete) {
      await deleteR2Object(key)
    }

    // Also delete any files in the restaurant's prefix (catch-all for any missed files)
    const restaurantPrefix = `restaurants/${restaurant.id}/`
    console.log(`[RESTAURANT DELETE] Deleting all objects with prefix: ${restaurantPrefix}`)
    await deleteR2ObjectsByPrefix(restaurantPrefix)

    // Delete the restaurant (cascade will handle: sections, categories, items, feedback, adminUsers, theme, uiSettings)
    await prisma.restaurant.delete({
      where: { id: restaurant.id },
    })

    console.log(`[RESTAURANT DELETE] Successfully deleted restaurant: ${slug}`)

    return NextResponse.json({
      success: true,
      message: `Restaurant "${restaurant.nameEn}" and all associated data have been deleted`,
    })
  } catch (error: any) {
    console.error('Error deleting restaurant:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

