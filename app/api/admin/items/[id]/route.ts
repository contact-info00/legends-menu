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

    // Verify item belongs to admin's restaurant
    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    const item = await prisma.item.update({
      where: { id: params.id },
      data: body,
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    // Verify item belongs to admin's restaurant
    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.item.delete({
      where: { id: params.id },
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




