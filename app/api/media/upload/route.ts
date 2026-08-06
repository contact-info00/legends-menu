import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import {
  type MediaScope,
  isOptimizableImage,
  isVideoContentType,
  optimizeImage,
  validateWelcomeVideo,
  MAX_RAW_IMAGE_UPLOAD_BYTES,
  MAX_WELCOME_VIDEO_BYTES,
} from '@/lib/media-optimization'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4']
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

const LEGACY_SCOPE_MAP: Record<string, MediaScope> = {
  logo: 'logo',
  footerLogo: 'footerLogo',
  welcomeBg: 'welcomeBg',
  menuBg: 'menuBg',
  itemImage: 'itemImage',
  categoryImage: 'categoryImage',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const scopeParam = (formData.get('scope') as string | null) || 'welcomeBg'

    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP images and MP4 videos are allowed' },
        { status: 400 }
      )
    }

    const isImage = isOptimizableImage(file.type)
    const isVideo = isVideoContentType(file.type)
    const maxSize = isImage ? MAX_RAW_IMAGE_UPLOAD_BYTES : MAX_WELCOME_VIDEO_BYTES

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: isImage
            ? `Image must be under ${MAX_RAW_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB`
            : `Video must be under ${MAX_WELCOME_VIDEO_BYTES / (1024 * 1024)}MB`,
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let mimeType = file.type
    let storedSize = buffer.length
    let originalSize = buffer.length
    let optimizedSize = buffer.length

    if (isImage) {
      const scope = LEGACY_SCOPE_MAP[scopeParam] || 'welcomeBg'
      const optimized = await optimizeImage(buffer, scope, file.type)
      buffer = Buffer.from(optimized.buffer)
      mimeType = optimized.contentType
      storedSize = optimized.optimizedSize
      originalSize = optimized.originalSize
      optimizedSize = optimized.optimizedSize
    } else if (isVideo) {
      const videoCheck = validateWelcomeVideo(buffer)
      if (!videoCheck.valid) {
        return NextResponse.json({ error: videoCheck.error }, { status: 400 })
      }
    }

    const media = await prisma.media.create({
      data: {
        mimeType,
        bytes: buffer,
        size: storedSize,
      },
    })

    return NextResponse.json({
      id: media.id,
      mimeType: media.mimeType,
      size: media.size,
      originalSize,
      optimizedSize,
    })
  } catch (error) {
    console.error('Error uploading media:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
