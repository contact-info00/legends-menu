export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAdminSession()

    const feedbacks = await prisma.feedback.findMany({
      where: {
        restaurantId: session.restaurantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ feedbacks })
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




