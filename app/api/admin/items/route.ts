export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import { z } from 'zod'

const createItemSchema = z.object({
  categoryId: z.string().min(1),
  nameKu: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  descriptionKu: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  price: z.number().min(0),
  imageMediaId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminSession()

    const body = await request.json()
    const validation = createItemSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Verify category belongs to the admin's restaurant
    const category = await prisma.category.findUnique({
      where: { id: validation.data.categoryId },
      include: {
        section: {
          select: { restaurantId: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category.section.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get max sortOrder for this category
    const maxSortOrder = await prisma.item.findFirst({
      where: { categoryId: validation.data.categoryId },
      orderBy: { sortOrder: 'desc' },
    })

    const item = await prisma.item.create({
      data: {
        restaurantId: session.restaurantId,
        categoryId: validation.data.categoryId,
        nameKu: validation.data.nameKu,
        nameEn: validation.data.nameEn,
        nameAr: validation.data.nameAr,
        descriptionKu: validation.data.descriptionKu ?? null,
        descriptionEn: validation.data.descriptionEn ?? null,
        descriptionAr: validation.data.descriptionAr ?? null,
        price: validation.data.price,
        imageMediaId: validation.data.imageMediaId ?? null,
        sortOrder: validation.data.sortOrder ?? (maxSortOrder ? maxSortOrder.sortOrder + 1 : 0),
        isActive: validation.data.isActive ?? true,
      },
    })

    // Invalidate cache so menu page reflects changes immediately
    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

