export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildCategoryCreateData,
} from '@/lib/menu-arabic-translation'
import { z } from 'zod'

const createCategorySchema = z.object({
  sectionId: z.string().min(1),
  nameKu: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  imageMediaId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    const body = await request.json()
    const validation = createCategorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const section = await prisma.section.findUnique({
      where: { id: validation.data.sectionId },
      select: { restaurantId: true },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (section.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const maxSortOrder = await prisma.category.findFirst({
      where: { sectionId: validation.data.sectionId },
      orderBy: { sortOrder: 'desc' },
    })

    const translatedData = await buildCategoryCreateData(validation.data)

    const category = await prisma.category.create({
      data: {
        restaurantId: session.restaurantId,
        sectionId: translatedData.sectionId,
        nameKu: translatedData.nameKu,
        nameEn: translatedData.nameEn,
        nameAr: translatedData.nameAr,
        imageMediaId: translatedData.imageMediaId ?? null,
        sortOrder: translatedData.sortOrder ?? (maxSortOrder ? maxSortOrder.sortOrder + 1 : 0),
        isActive: translatedData.isActive ?? true,
      },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
