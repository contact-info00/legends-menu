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
import { parseOptionalPriceAdjustment } from '@/lib/advanced-options'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { optionId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.advancedOption.findUnique({
      where: { id: params.optionId },
      select: {
        id: true,
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        priceAdjustment: true,
        sortOrder: true,
        isActive: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
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
      priceAdjustment?: number | null
      sortOrder?: number
      isActive?: boolean
    } = {}

    if (typeof named.nameKu === 'string') data.nameKu = named.nameKu
    if (typeof named.nameEn === 'string') data.nameEn = named.nameEn
    if (typeof named.nameAr === 'string') data.nameAr = named.nameAr

    if (body.priceAdjustment !== undefined) {
      const priceAdjustment = parseOptionalPriceAdjustment(body.priceAdjustment)
      if (priceAdjustment === undefined) {
        return NextResponse.json(
          { error: 'priceAdjustment must be a number or null' },
          { status: 400 }
        )
      }
      data.priceAdjustment = priceAdjustment
    }

    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    const option = await prisma.advancedOption.update({
      where: { id: params.optionId },
      data,
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(option)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Error updating advanced option:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { optionId: string } }
) {
  try {
    const session = await requireAdminSession()

    const existing = await prisma.advancedOption.findUnique({
      where: { id: params.optionId },
      select: { restaurantId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 })
    }

    if (existing.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.advancedOption.delete({
      where: { id: params.optionId },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting advanced option:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
