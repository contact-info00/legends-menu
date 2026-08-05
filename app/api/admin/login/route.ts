export const dynamic = "force-dynamic"
export const runtime = 'nodejs'


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPin, createAdminSession, checkRateLimit } from '@/lib/auth'
import { requireRestaurantBySlug } from '@/lib/restaurant-utils'
import { z } from 'zod'

const loginSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, 'PIN must be 4 digits'),
  slug: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Check rate limit
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { pin, slug } = validation.data

    // Verify restaurant exists
    const restaurant = await requireRestaurantBySlug(slug)

    // Get admin users for this restaurant only - select only needed fields for better performance
    const adminList = await prisma.adminUser.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
      },
      select: {
        id: true,
        pinHash: true,
        restaurantId: true,
      },
    })

    if (adminList.length === 0) {
      return NextResponse.json({ error: 'No admin accounts found for this restaurant' }, { status: 404 })
    }

    // Try to find an admin with matching PIN (parallelize for performance)
    const pinCheckStartTime = Date.now()
    const pinChecks = await Promise.all(
      adminList.map(admin => verifyPin(pin, admin.pinHash))
    )
    const matchedAdmin = adminList.find((_, i) => pinChecks[i]) || null
    const pinCheckTime = Date.now() - startTime
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] Login PIN verification: ${pinCheckTime}ms (${adminList.length} admins checked in parallel)`)
    }

    if (!matchedAdmin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: matchedAdmin.id },
      data: { lastLoginAt: new Date() },
    })

    // Verify admin's restaurantId matches the login restaurant (security check)
    if (matchedAdmin.restaurantId !== restaurant.id) {
      console.error(`[SECURITY] Admin restaurantId mismatch: admin restaurantId=${matchedAdmin.restaurantId}, login restaurantId=${restaurant.id}, slug=${slug}`)
      return NextResponse.json({ error: 'Invalid admin for this restaurant' }, { status: 403 })
    }

    // Create session with restaurant_id and admin_user_id
    await createAdminSession(restaurant.id, matchedAdmin.id)

    // Log successful login for debugging
    const totalTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] Login total: ${totalTime}ms`)
    }
    console.log(`[LOGIN] Admin logged in: restaurantId=${restaurant.id}, slug=${slug}, adminId=${matchedAdmin.id}`)

    return NextResponse.json({ success: true, adminId: matchedAdmin.id, restaurantId: restaurant.id, slug: restaurant.slug })
  } catch (error) {
    console.error('[ERROR] Admin login error:', error)
    console.error('[ERROR] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    if (error instanceof Error && error.message === 'Restaurant not found') {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}




