import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPin, createAdminSession, checkRateLimit } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, 'PIN must be 4 digits'),
})

export async function POST(request: NextRequest) {
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

    const { pin } = validation.data

    // Get admin user
    const admin = await prisma.adminUser.findFirst()
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Verify PIN
    const isValid = await verifyPin(pin, admin.pinHash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    // Create session
    await createAdminSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




