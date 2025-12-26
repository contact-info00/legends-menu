import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { z } from 'zod'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4']
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => {
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
      if (isImage) return file.size <= MAX_IMAGE_SIZE
      if (isVideo) return file.size <= MAX_VIDEO_SIZE
      return false
    },
    'File size must be less than 5MB for images or 20MB for videos'
  ).refine(
    (file) => ALLOWED_MIME_TYPES.includes(file.type),
    'Only JPEG, PNG, WebP images and MP4 videos are allowed'
  ),
})

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const isAuthenticated = await getAdminSession()
    if (!isAuthenticated) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    // Validate file
    const validation = uploadSchema.safeParse({ file })
    if (!validation.success) {
      const errorMessage = validation.error.errors[0].message
      console.error('Validation error:', errorMessage, 'File type:', file.type, 'File size:', file.size)
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save to database
    const media = await prisma.media.create({
      data: {
        mimeType: file.type,
        bytes: buffer,
        size: file.size,
      },
    })

    console.log('Media uploaded successfully:', { id: media.id, mimeType: media.mimeType, size: media.size })
    return NextResponse.json({ id: media.id, mimeType: media.mimeType, size: media.size })
  } catch (error: any) {
    console.error('Error uploading media:', error)
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

