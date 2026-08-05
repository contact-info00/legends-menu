import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const feedbackSchema = z.object({
  restaurantSlug: z.string().min(1),
  staffRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  hygieneRating: z.number().min(1).max(5),
  satisfactionEmoji: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
})

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Resolve restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: validation.data.restaurantSlug },
      select: { id: true },
    })

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Create feedback with restaurantId
    const feedback = await prisma.feedback.create({
      data: {
        restaurantId: restaurant.id,
        staffRating: validation.data.staffRating,
        serviceRating: validation.data.serviceRating,
        hygieneRating: validation.data.hygieneRating,
        satisfactionEmoji: validation.data.satisfactionEmoji ?? null,
        phoneNumber: validation.data.phoneNumber ?? null,
        tableNumber: validation.data.tableNumber ?? null,
        comment: validation.data.comment ?? null,
      },
    })

    return NextResponse.json({ id: feedback.id, success: true })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




