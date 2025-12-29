import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
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

    return NextResponse.json(
      { theme },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching theme:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // Return a default theme if there's an error
    return NextResponse.json(
      {
        theme: {
          id: 'theme-1',
          appBg: '#400810',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  }
}


