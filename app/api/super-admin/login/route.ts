export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createSuperAdminSession, checkRateLimit, getSuperAdminPin } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  pin: z.string().length(4).regex(/^\d+$/, 'PIN must be 4 digits'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
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

    // Verify PIN against super admin PIN (1244)
    const superAdminPin = getSuperAdminPin()
    
    // Direct comparison for super admin PIN (hardcoded)
    if (pin !== superAdminPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // Create super admin session
    await createSuperAdminSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Super admin login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

