export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildNamedEntityCreateData,
} from '@/lib/advanced-options-translation'
import { parseOptionalPriceAdjustment } from '@/lib/advanced-options'

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await requireAdminSession()

    const group = await prisma.advancedOptionGroup.findUnique({
      where: { id: params.groupId },
      select: { id: true, restaurantId: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const nameKu = typeof body.nameKu === 'string' ? body.nameKu.trim() : ''
    const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : ''

    if (!nameKu || !nameEn) {
      return NextResponse.json(
        { error: 'nameKu and nameEn are required' },
        { status: 400 }
      )
    }

    const priceAdjustment = parseOptionalPriceAdjustment(body.priceAdjustment)
    if (body.priceAdjustment !== undefined && priceAdjustment === undefined) {
      return NextResponse.json(
        { error: 'priceAdjustment must be a number or null' },
        { status: 400 }
      )
    }

    const names = await buildNamedEntityCreateData({ nameKu, nameEn })

    const maxSort = await prisma.advancedOption.aggregate({
      where: { groupId: group.id },
      _max: { sortOrder: true },
    })

    const option = await prisma.advancedOption.create({
      data: {
        groupId: group.id,
        restaurantId: session.restaurantId,
        ...names,
        priceAdjustment: priceAdjustment === undefined ? null : priceAdjustment,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        isActive: body.isActive === false ? false : true,
      },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(option, { status: 201 })
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Error creating advanced option:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
