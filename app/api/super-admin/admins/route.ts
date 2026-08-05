export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSuperAdminSession, hashPin } from '@/lib/auth'
import { z } from 'zod'

const createAdminSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

const updateAdminSchema = z.object({
  adminId: z.string(),
  newPin: z.string().length(4).regex(/^\d+$/, 'PIN must be 4 digits'),
})

export async function GET(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }

    // First verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, slug: true, nameEn: true, nameKu: true, nameAr: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const admins = await prisma.adminUser.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        restaurantId: true,
        displayName: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Manually add restaurant info to each admin
    const adminsWithRestaurant = admins.map(admin => ({
      ...admin,
      restaurant,
    }))

    return NextResponse.json({ admins: adminsWithRestaurant })
  } catch (error: any) {
    console.error('Error fetching admins:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json({ error: errorMessage, details: error?.code }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createAdminSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation error:', validation.error.errors)
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { restaurantId, pin } = validation.data

    // Validate restaurantId is provided
    if (!restaurantId || typeof restaurantId !== 'string' || restaurantId.trim().length === 0) {
      console.error('Missing or invalid restaurantId:', restaurantId)
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 })
    }

    // Validate pin is exactly 4 digits
    if (!pin || !/^\d{4}$/.test(pin)) {
      console.error('Invalid PIN format:', pin)
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    })

    if (!restaurant) {
      console.error('Restaurant not found:', restaurantId)
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Hash the PIN
    const pinHash = await hashPin(pin)

    // Create admin user with proper field mapping
    const admin = await prisma.adminUser.create({
      data: {
        restaurantId: restaurantId,
        pinHash: pinHash,
      },
    })

    console.log('Admin created successfully:', { id: admin.id, restaurantId })

    return NextResponse.json({
      success: true,
      ok: true,
      admin: {
        id: admin.id,
        createdAt: admin.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Error creating admin:', error)
    console.error('Full error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      cause: error?.cause,
    })

    // Handle Prisma errors
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Admin account already exists' }, { status: 400 })
    }
    if (error?.code === 'P2003') {
      return NextResponse.json({ error: 'Invalid restaurant ID' }, { status: 400 })
    }
    if (error?.code === 'P2021') {
      return NextResponse.json({ 
        error: 'Database table or column does not exist. Please run database migrations.',
        details: error?.meta 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateAdminSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation error:', validation.error.errors)
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { adminId, newPin } = validation.data

    // Validate PIN format
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    const pinHash = await hashPin(newPin)

    const admin = await prisma.adminUser.update({
      where: { id: adminId },
      data: {
        pinHash,
      },
    })

    console.log('Admin PIN updated successfully:', { id: admin.id })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
      },
    })
  } catch (error: any) {
    console.error('Error updating admin PIN:', error)
    console.error('Full error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }
    if (error?.code === 'P2021') {
      return NextResponse.json({ 
        error: 'Database table or column does not exist. Please run database migrations.',
        details: error?.meta 
      }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAuthenticated = await getSuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { adminId } = body

    if (!adminId || typeof adminId !== 'string') {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 })
    }

    // Get the admin to check restaurant
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, restaurantId: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Check if there's at least one admin remaining for this restaurant after deletion
    const adminCount = await prisma.adminUser.count({
      where: {
        restaurantId: admin.restaurantId,
        isActive: true,
      },
    })

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin account for this restaurant' },
        { status: 400 }
      )
    }

    await prisma.adminUser.delete({
      where: { id: adminId },
    })

    console.log('Admin deleted successfully:', { id: adminId })

    return NextResponse.json({
      success: true,
      message: 'Admin account deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting admin:', error)
    console.error('Full error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }
    if (error?.code === 'P2021') {
      return NextResponse.json({ 
        error: 'Database table or column does not exist. Please run database migrations.',
        details: error?.meta 
      }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}

