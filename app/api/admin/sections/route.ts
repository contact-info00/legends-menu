import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
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
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createSectionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Get restaurant ID (assuming single restaurant)
    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Get max sortOrder
    const maxSortOrder = await prisma.section.findFirst({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: 'desc' },
    })

    const section = await prisma.section.create({
      data: {
        restaurantId: restaurant.id,
        nameKu: validation.data.nameKu,
        nameEn: validation.data.nameEn,
        nameAr: validation.data.nameAr,
        sortOrder: validation.data.sortOrder ?? (maxSortOrder ? maxSortOrder.sortOrder + 1 : 0),
        isActive: validation.data.isActive ?? true,
      },
    })

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




