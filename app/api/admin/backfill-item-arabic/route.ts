export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  backfillMissingItemArabicForRestaurant,
} from '@/lib/backfill-item-arabic'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await requireAdminSession()

    const updated = await backfillMissingItemArabicForRestaurant(session.restaurantId)
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({
      success: true,
      message: `Backfilled Arabic translations for ${updated.length} item(s).`,
      updated,
    })
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('[backfill-item-arabic] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await requireAdminSession()

    const items = await prisma.item.findMany({
      where: { restaurantId: session.restaurantId },
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
      },
      orderBy: { sortOrder: 'asc' },
    })

    const pending = items.filter((item) => {
      const arabic = (item.nameAr ?? '').trim()
      const english = (item.nameEn ?? '').trim()
      return !arabic || arabic.toLowerCase() === english.toLowerCase()
    })

    return NextResponse.json({
      totalItems: items.length,
      pendingCount: pending.length,
      pending: pending.map((item) => ({
        id: item.id,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
      })),
    })
  } catch (error) {
    console.error('[backfill-item-arabic] Status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
