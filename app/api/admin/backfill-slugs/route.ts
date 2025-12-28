import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

// Helper function to generate slug from restaurant name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Backfilling slugs for all restaurants...')

    // Get all restaurants
    const allRestaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        nameEn: true,
        slug: true,
      },
    })

    const results: Array<{ id: string; nameEn: string; oldSlug: string; newSlug: string }> = []

    for (const restaurant of allRestaurants) {
      // Generate slug from English name
      const expectedSlug = generateSlug(restaurant.nameEn || 'restaurant')

      // Check if slug needs updating
      if (!restaurant.slug || restaurant.slug !== expectedSlug) {
        // Check if the expected slug already exists for another restaurant
        const existing = await prisma.restaurant.findUnique({
          where: { slug: expectedSlug },
        })

        let finalSlug = expectedSlug
        if (existing && existing.id !== restaurant.id) {
          // If slug exists for another restaurant, append restaurant ID to make it unique
          finalSlug = `${expectedSlug}-${restaurant.id.slice(-6)}`
        }

        // Update restaurant with slug
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { slug: finalSlug },
        })

        results.push({
          id: restaurant.id,
          nameEn: restaurant.nameEn,
          oldSlug: restaurant.slug || '(missing)',
          newSlug: finalSlug,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled slugs for ${results.length} restaurant(s)`,
      results,
      totalRestaurants: allRestaurants.length,
    })
  } catch (error: any) {
    console.error('Error backfilling slugs:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

