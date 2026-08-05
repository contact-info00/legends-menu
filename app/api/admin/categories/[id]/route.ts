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

    // Verify category belongs to admin's restaurant
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    const category = await prisma.category.update({
      where: { id: params.id },
      data: body,
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    // Verify category belongs to admin's restaurant
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete all items in this category first (only items belonging to this restaurant)
    await prisma.item.deleteMany({
      where: { 
        categoryId: params.id,
        restaurantId: session.restaurantId,
      },
    })

    // Delete the category
    await prisma.category.delete({
      where: { id: params.id },
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




