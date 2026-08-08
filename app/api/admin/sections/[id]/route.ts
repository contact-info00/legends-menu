export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'
import { invalidateMenuDataCaches } from '@/lib/cache-invalidation'
import {
  AzureTranslatorError,
  buildSectionUpdateData,
} from '@/lib/menu-arabic-translation'
import { Prisma } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    const existingSection = await prisma.section.findUnique({
      where: { id: params.id },
      select: {
        restaurantId: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        sortOrder: true,
        isActive: true,
      },
    })

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (existingSection.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const updateData = await buildSectionUpdateData(body, existingSection)

    const section = await prisma.section.update({
      where: { id: params.id },
      data: updateData as Prisma.SectionUpdateInput,
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json(section)
  } catch (error) {
    if (error instanceof AzureTranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    console.error('Error updating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdminSession()

    const section = await prisma.section.findUnique({
      where: { id: params.id },
      select: { 
        restaurantId: true,
        categories: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    if (section.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const categoryIds = section.categories.map(cat => cat.id)

    if (categoryIds.length > 0) {
      await prisma.item.deleteMany({
        where: { 
          categoryId: { in: categoryIds },
          restaurantId: session.restaurantId,
        },
      })
    }

    await prisma.category.deleteMany({
      where: { 
        sectionId: params.id,
        restaurantId: session.restaurantId,
      },
    })

    await prisma.section.delete({
      where: { id: params.id },
    })

    invalidateMenuDataCaches(session.restaurantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



