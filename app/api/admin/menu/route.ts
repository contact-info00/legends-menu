import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sections = await prisma.section.findMany({
      include: {
        categories: {
          include: {
            items: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




