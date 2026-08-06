import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { generatePresignedUrl, generateR2Key, getR2PublicUrl } from '@/lib/r2-client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const presignSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  scope: z.enum(['logo', 'footerLogo', 'welcomeBg', 'itemImage', 'categoryImage']),
  restaurantId: z.string().min(1),
  itemId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Server-side only check
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint is server-only' }, { status: 403 })
  }

  try {
    // Log that presign endpoint is being called (for verification)
    console.log('[R2 PRESIGN] Presign endpoint called')

    // Check admin authentication
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = presignSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { fileName, contentType, scope, restaurantId, itemId } = validation.data

    // Validate file type
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const ALLOWED_VIDEO_TYPES = ['video/mp4']
    const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Only JPEG, PNG, WebP images and MP4 videos are allowed.' },
        { status: 400 }
      )
    }

    // Generate R2 key
    const key = generateR2Key(scope, restaurantId, fileName, itemId)

    // Generate presigned URL (valid for 1 hour)
    const uploadUrl = await generatePresignedUrl(key, contentType, 3600)

    // Generate public URL
    const publicUrl = getR2PublicUrl(key)

    // Log successful presign (for verification - appears in Vercel logs)
    console.log('[R2 PRESIGN] ✅ Successfully generated presigned URL')
    console.log('[R2 PRESIGN] Key:', key)
    console.log('[R2 PRESIGN] Scope:', scope)
    console.log('[R2 PRESIGN] ContentType:', contentType)

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
    })
  } catch (error) {
    console.error('[R2 PRESIGN] ❌ Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}

