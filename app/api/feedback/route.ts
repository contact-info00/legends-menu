import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const feedbackSchema = z.object({
  staffRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  hygieneRating: z.number().min(1).max(5),
  satisfactionEmoji: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  tableNumber: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
})

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

    const feedback = await prisma.feedback.create({
      data: validation.data,
    })

    return NextResponse.json({ id: feedback.id, success: true })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




