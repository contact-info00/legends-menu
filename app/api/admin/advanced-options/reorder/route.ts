export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'

const reorderSchema = z.object({
  options: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    const body = await request.json()
    const validation = reorderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    const optionIds = validation.data.options.map((o) => o.id)
    const existing = await prisma.advancedOption.findMany({
      where: {
        id: { in: optionIds },
        restaurantId: session.restaurantId,
      },
      select: { id: true },
    })

    if (existing.length !== optionIds.length) {
      return NextResponse.json(
        { error: 'Some options do not exist or belong to another restaurant' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      validation.data.options.map((option) =>
        prisma.advancedOption.update({
          where: { id: option.id },
          data: { sortOrder: option.sortOrder },
        })
      )
    )

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering advanced options:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
