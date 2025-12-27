import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Disable all caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      where: {
        isActive: true,
      },
      include: {
        categories: {
          where: {
            isActive: true,
          },
          include: {
            items: {
              where: {
                isActive: true,
              },
            },
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

    return NextResponse.json(
      { sections, timestamp: Date.now() },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



