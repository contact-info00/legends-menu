import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { z } from 'zod'

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number(),
  })),
})

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = reorderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Update all sections with new sortOrder
    const updateResults = await Promise.allSettled(
      validation.data.items.map((item) =>
        prisma.section.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    )

    // Check if any updates failed
    const failures = updateResults.filter((result) => result.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some section updates failed:', failures)
      const errorMessages = failures.map((f) => 
        f.status === 'rejected' ? f.reason?.message || 'Unknown error' : ''
      )
      return NextResponse.json(
        { 
          error: 'Some sections failed to update',
          details: errorMessages,
          failedCount: failures.length,
          totalCount: validation.data.items.length
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering sections:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

