export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    // Verify section belongs to admin's restaurant
    const existingSection = await prisma.section.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (existingSection.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    const section = await prisma.section.update({
      where: { id: params.id },
      data: body,
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    // Verify section belongs to admin's restaurant and get related data
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      select: { 
        restaurantId: true,
        categories: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (section.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const categoryIds = section.categories.map(cat => cat.id)

    // Delete all items in all categories (only for this restaurant)
    if (categoryIds.length > 0) {
      await prisma.item.deleteMany({
        where: { 
          categoryId: { in: categoryIds },
          restaurantId: session.restaurantId,
        },
      })
    }

    // Delete all categories
    await prisma.category.deleteMany({
      where: { 
        sectionId: params.id,
        restaurantId: session.restaurantId,
      },
    })

    // Delete the section
    await prisma.section.delete({
      where: { id: params.id },
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




