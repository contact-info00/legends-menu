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
import { parseItemLevelValue } from '@/lib/advanced-options'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { levelId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.itemLevel.findUnique({
      where: { id: params.levelId },
      select: {
        id: true,
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        value: true,
        sortOrder: true,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
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
      value?: number
      sortOrder?: number
      isActive?: boolean
    } = {}

    if (typeof named.nameKu === 'string') data.nameKu = named.nameKu
    if (typeof named.nameEn === 'string') data.nameEn = named.nameEn
    if (typeof named.nameAr === 'string') data.nameAr = named.nameAr

    if (body.value !== undefined) {
      const value = parseItemLevelValue(body.value)
      if (value === null) {
        return NextResponse.json(
          { error: 'value must be an integer from 1 to 5' },
          { status: 400 }
        )
      }
      data.value = value
    }

    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    const level = await prisma.itemLevel.update({
      where: { id: params.levelId },
      data,
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(level)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Error updating item level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { levelId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.itemLevel.findUnique({
      where: { id: params.levelId },
      select: { restaurantId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 })
    }

    if (existing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.itemLevel.delete({
      where: { id: params.levelId },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
