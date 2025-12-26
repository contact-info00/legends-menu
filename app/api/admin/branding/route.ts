import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    return NextResponse.json({ brandColors: restaurant.brandColors })
  } catch (error) {
    console.error('Error fetching branding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { brandColors: body.brandColors },
    })

    return NextResponse.json({ brandColors: updated.brandColors })
  } catch (error) {
    console.error('Error updating branding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




