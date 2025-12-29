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
    const fileSize = media.size

    // Parse Range header for video streaming (required for mobile browsers)
    const rangeHeader = request.headers.get('range')
    
    // Determine headers based on mime type
    const headers: Record<string, string> = {
      'Content-Type': media.mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    // Handle Range requests for video streaming (critical for mobile)
    if (rangeHeader && media.mimeType.startsWith('video/')) {
      // Parse range header (e.g., "bytes=0-1023" or "bytes=1024-")
      const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10)
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1
        const chunkSize = end - start + 1

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          return new NextResponse(null, {
            status: 416, // Range Not Satisfiable
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          })
        }

        // Extract the requested byte range
        const chunk = buffer.slice(start, end + 1)

        headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`
        headers['Content-Length'] = chunkSize.toString()

        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers,
        })
      }
    }

    // Full file response (no range request)
    headers['Content-Length'] = fileSize.toString()
    
    return new NextResponse(buffer, {
      headers,
    })
  } catch (error) {
    console.error('Error fetching media:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

