export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import { findOwnedItem } from '@/lib/advanced-options-server'
import {
  AzureTranslatorError,
  buildNamedEntityCreateData,
} from '@/lib/advanced-options-translation'
import { parseItemLevelValue } from '@/lib/advanced-options'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()
    const item = await findOwnedItem(params.id, session.restaurantId)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const body = await request.json()
    const nameKu = typeof body.nameKu === 'string' ? body.nameKu.trim() : ''
    const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : ''
    const value = parseItemLevelValue(body.value)

    if (!nameKu || !nameEn) {
      return NextResponse.json(
        { error: 'nameKu and nameEn are required' },
        { status: 400 }
      )
    }

    if (value === null) {
      return NextResponse.json(
        { error: 'value must be an integer from 1 to 5' },
        { status: 400 }
      )
    }

    const names = await buildNamedEntityCreateData({ nameKu, nameEn })

    const maxSort = await prisma.itemLevel.aggregate({
      where: { itemId: item.id },
      _max: { sortOrder: true },
    })

    const level = await prisma.itemLevel.create({
      data: {
        itemId: item.id,
        restaurantId: session.restaurantId,
        ...names,
        value,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        isActive: body.isActive === false ? false : true,
      },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(level, { status: 201 })
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('Error creating item level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
