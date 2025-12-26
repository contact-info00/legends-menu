import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const feedbacks = await prisma.feedback.findMany({
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




