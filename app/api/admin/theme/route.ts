import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { z } from 'zod'

const themeSchema = z.object({
  appBg: z.string(),
})

export async function GET() {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let theme = await prisma.theme.findUnique({
      where: { id: 'theme-1' },
    })

    // If theme doesn't exist, create it with defaults
    if (!theme) {
      theme = await prisma.theme.create({
        data: {
          id: 'theme-1',
          appBg: '#400810',
        },
      })
    }

    return NextResponse.json({ theme })
  } catch (error) {
    console.error('Error fetching theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = themeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const themeData = validation.data

    // Upsert theme (create if doesn't exist, update if exists)
    const theme = await prisma.theme.upsert({
      where: { id: 'theme-1' },
      update: themeData,
      create: {
        id: 'theme-1',
        ...themeData,
      },
    })

    return NextResponse.json({ theme, success: true })
  } catch (error) {
    console.error('Error saving theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}

