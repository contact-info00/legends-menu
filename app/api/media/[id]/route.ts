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

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': media.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error fetching media:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}




