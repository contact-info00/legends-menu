export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'

const reorderSchema = z.object({
  groups: z.array(
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

    const groupIds = validation.data.groups.map((g) => g.id)
    const existing = await prisma.advancedOptionGroup.findMany({
      where: {
        id: { in: groupIds },
        restaurantId: session.restaurantId,
      },
      select: { id: true },
    })

    if (existing.length !== groupIds.length) {
      return NextResponse.json(
        { error: 'Some groups do not exist or belong to another restaurant' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      validation.data.groups.map((group) =>
        prisma.advancedOptionGroup.update({
          where: { id: group.id },
          data: { sortOrder: group.sortOrder },
        })
      )
    )

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering advanced option groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
