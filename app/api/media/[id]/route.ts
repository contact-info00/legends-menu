import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const media = await prisma.media.findUnique({
      where: { id },
    })

    if (!media) {
      return new NextResponse('Media not found', { status: 404 })
    }

    // Handle HEAD requests (for content-type detection)
    if (request.method === 'HEAD') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': media.mimeType,
          'Content-Length': media.size.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD',
        },
      })
    }

    // Convert bytes to Buffer for response
    // Prisma returns bytes as Buffer in Node.js
    const buffer = Buffer.isBuffer(media.bytes) 
      ? media.bytes 
      : Buffer.from(media.bytes as any)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': media.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('Error fetching media:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}




