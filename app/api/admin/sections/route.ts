export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildSectionCreateData,
} from '@/lib/menu-arabic-translation'
import { z } from 'zod'

const createSectionSchema = z.object({
  nameKu: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
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

    const maxSortOrder = await prisma.section.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { sortOrder: 'desc' },
    })

    const translatedData = await buildSectionCreateData(validation.data)

    const section = await prisma.section.create({
      data: {
        restaurantId: session.restaurantId,
        nameKu: translatedData.nameKu,
        nameEn: translatedData.nameEn,
        nameAr: translatedData.nameAr,
        sortOrder: translatedData.sortOrder ?? (maxSortOrder ? maxSortOrder.sortOrder + 1 : 0),
        isActive: translatedData.isActive ?? true,
      },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(section)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('Error creating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



