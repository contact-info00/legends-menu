export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildItemUpdateData,
} from '@/lib/menu-arabic-translation'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
      select: {
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        descriptionKu: true,
        descriptionEn: true,
        descriptionAr: true,
        price: true,
        sortOrder: true,
        isActive: true,
        imageMediaId: true,
        imageR2Key: true,
        imageR2Url: true,
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const updateData = await buildItemUpdateData(body, existingItem)

    const item = await prisma.item.update({
      where: { id: params.id },
      data: updateData as Prisma.ItemUpdateInput,
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

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

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



