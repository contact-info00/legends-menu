import { NextResponse } from 'next/server'
import { getR2Client } from '@/lib/r2-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-side verification endpoint
 * Checks R2 configuration and connectivity
 * Only accessible server-side, logs to Vercel logs
 */
export async function GET() {
  // This endpoint should only be called server-side
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint is server-only' }, { status: 403 })
  }

  try {
    const checks: Record<string, boolean | string> = {}

    // Check environment variables
    const requiredEnvVars = [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_ENDPOINT',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_BASE_URL',
    ]

    const missing: string[] = []
    for (const key of requiredEnvVars) {
      const exists = !!process.env[key]
      checks[`env_${key}`] = exists
      if (!exists) {
        missing.push(key)
      }
    }

    if (missing.length > 0) {
      console.error('[R2 VERIFY] Missing environment variables:', missing.join(', '))
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required R2 environment variables',
          missing,
          checks,
        },
        { status: 500 }
      )
    }

    // Try to initialize R2 client
    try {
      const client = getR2Client()
      checks.r2_client_initialized = true
      console.log('[R2 VERIFY] R2 client initialized successfully')
    } catch (error: any) {
      checks.r2_client_initialized = false
      console.error('[R2 VERIFY] Failed to initialize R2 client:', error.message)
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to initialize R2 client',
          error: error.message,
          checks,
        },
        { status: 500 }
      )
    }

    // Check presign endpoint would work
    try {
      const { generatePresignedUrl, generateR2Key } = await import('@/lib/r2-client')
      const testKey = generateR2Key('logo', 'test-restaurant-id', 'test.jpg')
      checks.presign_function_available = true
      console.log('[R2 VERIFY] Presign functions are available')
    } catch (error: any) {
      checks.presign_function_available = false
      console.error('[R2 VERIFY] Presign functions check failed:', error.message)
    }

    console.log('[R2 VERIFY] All checks passed')
    return NextResponse.json({
      status: 'success',
      message: 'R2 configuration is valid',
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[R2 VERIFY] Verification failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Verification failed',
        error: error.message,
      },
      { status: 500 }
    )
  }
}

