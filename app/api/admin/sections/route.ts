export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import { z } from 'zod'

const createSectionSchema = z.object({
  nameKu: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    const body = await request.json()
    const validation = createSectionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get max sortOrder for this restaurant
    const maxSortOrder = await prisma.section.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { sortOrder: 'desc' },
    })

    const section = await prisma.section.create({
      data: {
        restaurantId: session.restaurantId,
        nameKu: validation.data.nameKu,
        nameEn: validation.data.nameEn,
        nameAr: validation.data.nameAr,
        sortOrder: validation.data.sortOrder ?? (maxSortOrder ? maxSortOrder.sortOrder + 1 : 0),
        isActive: validation.data.isActive ?? true,
      },
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




