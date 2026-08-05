import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getR2Client, generateR2Key, getR2PublicUrl } from '@/lib/r2-client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'
import {
  type MediaScope,
  isOptimizableImage,
  isVideoContentType,
  optimizeImage,
  replaceKeyExtension,
  validateWelcomeVideo,
  MAX_RAW_IMAGE_UPLOAD_BYTES,
  MAX_WELCOME_VIDEO_BYTES,
} from '@/lib/media-optimization'

const uploadSchema = z.object({
  scope: z.enum(['logo', 'footerLogo', 'welcomeBg', 'menuBg', 'itemImage', 'categoryImage', 'platformFooterLogo']),
  restaurantId: z.string().optional(),
  itemId: z.string().optional(),
})

/**
 * Infer Content-Type from file extension if not provided
 */
function inferContentType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== 'application/octet-stream' && providedType !== '') {
    return providedType
  }

  const ext = fileName.toLowerCase().split('.').pop() || ''
  const extensionMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  }

  return extensionMap[ext] || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint is server-only' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const scope = formData.get('scope') as string
    const restaurantId = formData.get('restaurantId') as string | null
    const itemId = formData.get('itemId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isPlatformScope = scope === 'platformFooterLogo'

    if (isPlatformScope) {
      const { getSuperAdminSession } = await import('@/lib/auth')
      const isAuthenticated = await getSuperAdminSession()
      if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      const isAuthenticated = await getAdminSession()
      if (!isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!isPlatformScope && !restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required for this scope' }, { status: 400 })
    }

    const validation = uploadSchema.safeParse({
      scope,
      restaurantId: restaurantId || undefined,
      itemId: itemId || undefined,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const contentType = inferContentType(file.name, file.type)
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const ALLOWED_VIDEO_TYPES = ['video/mp4']
    const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Only JPEG, PNG, WebP images and MP4 videos are allowed.' },
        { status: 400 }
      )
    }

    const isImage = isOptimizableImage(contentType)
    const isVideo = isVideoContentType(contentType)

    if (isVideo && validation.data.scope !== 'welcomeBg') {
      return NextResponse.json(
        { error: 'Videos are only allowed for welcome backgrounds.' },
        { status: 400 }
      )
    }

    const maxRawSize = isImage ? MAX_RAW_IMAGE_UPLOAD_BYTES : MAX_WELCOME_VIDEO_BYTES
    if (file.size > maxRawSize) {
      return NextResponse.json(
        {
          error: isImage
            ? `Image file exceeds ${MAX_RAW_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB upload limit.`
            : `Video must be under ${MAX_WELCOME_VIDEO_BYTES / (1024 * 1024)}MB. Compress before uploading.`,
        },
        { status: 400 }
      )
    }

    let key: string
    if (isPlatformScope) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 9)
      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .toLowerCase()
        .substring(0, 100)
      key = `platform/footer-logo/${timestamp}-${random}-${safeFileName}`
    } else {
      key = generateR2Key(validation.data.scope, validation.data.restaurantId!, file.name, validation.data.itemId)
    }

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let uploadContentType = contentType
    let originalSize = buffer.length
    let optimizedSize = buffer.length
    let videoRecommendation: string | undefined

    if (isImage) {
      const optimized = await optimizeImage(buffer, validation.data.scope as MediaScope, contentType)
      buffer = Buffer.from(optimized.buffer)
      uploadContentType = optimized.contentType
      originalSize = optimized.originalSize
      optimizedSize = optimized.optimizedSize
      key = replaceKeyExtension(key, optimized.extension)

      console.log('[R2 UPLOAD] Image optimized', {
        scope: validation.data.scope,
        originalSize,
        optimizedSize,
        savings: `${Math.round((1 - optimizedSize / originalSize) * 100)}%`,
        dimensions: `${optimized.width}×${optimized.height}`,
      })
    } else if (isVideo) {
      const videoCheck = validateWelcomeVideo(buffer)
      if (!videoCheck.valid) {
        return NextResponse.json({ error: videoCheck.error }, { status: 400 })
      }
      videoRecommendation = videoCheck.recommendation
    }

    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: uploadContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })

    await client.send(command)

    const publicUrl = getR2PublicUrl(key)

    return NextResponse.json({
      key,
      publicUrl,
      contentType: uploadContentType,
      originalSize,
      optimizedSize,
      ...(videoRecommendation ? { recommendation: videoRecommendation } : {}),
    })
  } catch (error) {
    console.error('[R2 UPLOAD PROXY] Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
