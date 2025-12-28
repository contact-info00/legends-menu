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
    console.log('Received reorder request:', JSON.stringify(body, null, 2))
    
    const validation = reorderSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation failed:', validation.error)
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    // Verify all category IDs exist
    const categoryIds = validation.data.items.map(item => item.id)
    const existingCategories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    })
    
    const existingIds = new Set(existingCategories.map(c => c.id))
    const missingIds = categoryIds.filter(id => !existingIds.has(id))
    
    if (missingIds.length > 0) {
      console.error('Some category IDs do not exist:', missingIds)
      return NextResponse.json(
        { 
          error: 'Some category IDs do not exist',
          missingIds,
        },
        { status: 400 }
      )
    }

    // Update all categories with new sortOrder using a transaction
    let updatedCategories
    try {
      updatedCategories = await prisma.$transaction(
        validation.data.items.map((item) =>
          prisma.category.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
            select: {
              id: true,
              sortOrder: true,
              nameEn: true,
              sectionId: true,
            },
          })
        )
      )
    } catch (transactionError) {
      console.error('Transaction failed:', transactionError)
      // Fall back to individual updates
      const updateResults = await Promise.allSettled(
        validation.data.items.map((item) =>
          prisma.category.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
            select: {
              id: true,
              sortOrder: true,
              nameEn: true,
              sectionId: true,
            },
          })
        )
      )

      // Check if any updates failed
      const failures = updateResults.filter((result) => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some category updates failed:', failures)
        const errorMessages = failures.map((f) => 
          f.status === 'rejected' ? f.reason?.message || 'Unknown error' : ''
        )
        return NextResponse.json(
          { 
            error: 'Some categories failed to update',
            details: errorMessages,
            failedCount: failures.length,
            totalCount: validation.data.items.length
          },
          { status: 500 }
        )
      }

      // Extract successful updates
      updatedCategories = updateResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.status === 'fulfilled' ? result.value : null)
        .filter(Boolean) as typeof updatedCategories
    }

    // Invalidate cache so menu page reflects changes immediately
    revalidateTag('menu')

    return NextResponse.json({ 
      success: true,
      updated: updatedCategories,
    })
  } catch (error) {
    console.error('Error reordering categories:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log detailed error for debugging
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

