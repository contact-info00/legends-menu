import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const media = await prisma.media.findUnique({
      where: { id: params.id },
    })

    if (!media) {
      return new NextResponse('Media not found', { status: 404 })
    }

    // Convert Buffer to ArrayBuffer for response
    const buffer = Buffer.from(media.bytes)

    // Determine headers based on mime type
    const headers: Record<string, string> = {
      'Content-Type': media.mimeType,
      'Content-Length': media.size.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    // Add Accept-Ranges header for video files (required for mobile video playback)
    if (media.mimeType.startsWith('video/')) {
      headers['Accept-Ranges'] = 'bytes'
    }

    return new NextResponse(buffer, {
      headers,
    })
  } catch (error) {
    console.error('Error fetching media:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

