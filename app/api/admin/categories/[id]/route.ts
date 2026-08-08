export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildCategoryUpdateData,
} from '@/lib/menu-arabic-translation'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      select: {
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        sortOrder: true,
        isActive: true,
        imageMediaId: true,
        imageR2Key: true,
        imageR2Url: true,
      },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const updateData = await buildCategoryUpdateData(body, existingCategory)

    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData as Prisma.CategoryUpdateInput,
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      select: { restaurantId: true },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existingCategory.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.item.deleteMany({
      where: { 
        categoryId: params.id,
        restaurantId: session.restaurantId,
      },
    })

    await prisma.category.delete({
      where: { id: params.id },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



