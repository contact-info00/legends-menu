export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildNamedEntityUpdateData,
} from '@/lib/advanced-options-translation'
import { isAdvancedSelectionMode } from '@/lib/advanced-options'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.advancedOptionGroup.findUnique({
      where: { id: params.groupId },
      select: {
        id: true,
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        selectionMode: true,
        sortOrder: true,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (existing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const named = await buildNamedEntityUpdateData(body, existing)

    const data: {
      nameKu?: string
      nameEn?: string
      nameAr?: string
      selectionMode?: string
      sortOrder?: number
      isActive?: boolean
    } = {}

    if (typeof named.nameKu === 'string') data.nameKu = named.nameKu
    if (typeof named.nameEn === 'string') data.nameEn = named.nameEn
    if (typeof named.nameAr === 'string') data.nameAr = named.nameAr
    if (isAdvancedSelectionMode(body.selectionMode)) {
      data.selectionMode = body.selectionMode
    }
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    const group = await prisma.advancedOptionGroup.update({
      where: { id: params.groupId },
      data,
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(group)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Error updating advanced option group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.advancedOptionGroup.findUnique({
      where: { id: params.groupId },
      select: { restaurantId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (existing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.advancedOptionGroup.delete({
      where: { id: params.groupId },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting advanced option group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
