import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { revalidateTag } from 'next/cache'
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

    // Update all items with new sortOrder using a transaction
    let updatedItems
    try {
      updatedItems = await prisma.$transaction(
        validation.data.items.map((item) =>
          prisma.item.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
            select: {
              id: true,
              sortOrder: true,
              nameEn: true,
              categoryId: true,
            },
          })
        )
      )
    } catch (transactionError) {
      console.error('Transaction failed:', transactionError)
      // Fall back to individual updates
      const updateResults = await Promise.allSettled(
        validation.data.items.map((item) =>
          prisma.item.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
            select: {
              id: true,
              sortOrder: true,
              nameEn: true,
              categoryId: true,
            },
          })
        )
      )

      // Check if any updates failed
      const failures = updateResults.filter((result) => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some item updates failed:', failures)
        const errorMessages = failures.map((f) => 
          f.status === 'rejected' ? f.reason?.message || 'Unknown error' : ''
        )
        return NextResponse.json(
          { 
            error: 'Some items failed to update',
            details: errorMessages,
            failedCount: failures.length,
            totalCount: validation.data.items.length
          },
          { status: 500 }
        )
      }

      // Extract successful updates
      updatedItems = updateResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean) as typeof updatedItems
    }

    // Invalidate cache so menu page reflects changes immediately
    revalidateTag('menu')

    return NextResponse.json({ 
      success: true,
      updated: updatedItems,
    })
  } catch (error) {
    console.error('Error reordering items:', error)
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

