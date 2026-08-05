import sharp from 'sharp'

export type MediaScope =
  | 'logo'
  | 'footerLogo'
  | 'welcomeBg'
  | 'menuBg'
  | 'itemImage'
  | 'categoryImage'
  | 'platformFooterLogo'

export interface OptimizedMedia {
  buffer: Buffer
  contentType: string
  extension: string
  originalSize: number
  optimizedSize: number
  width?: number
  height?: number
}

export interface VideoValidationResult {
  valid: boolean
  error?: string
  recommendation?: string
  width?: number
  height?: number
}

interface ScopeProfile {
  maxWidth: number
  maxHeight: number
  quality: number
  targetMaxBytes: number
  minQuality: number
}

/** Display-aware resize + compression targets per upload scope */
const SCOPE_PROFILES: Record<MediaScope, ScopeProfile> = {
  logo: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 88,
    targetMaxBytes: 30 * 1024,
    minQuality: 60,
  },
  footerLogo: {
    maxWidth: 400,
    maxHeight: 200,
    quality: 88,
    targetMaxBytes: 30 * 1024,
    minQuality: 60,
  },
  platformFooterLogo: {
    maxWidth: 240,
    maxHeight: 120,
    quality: 88,
    targetMaxBytes: 30 * 1024,
    minQuality: 60,
  },
  itemImage: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 82,
    targetMaxBytes: 120 * 1024,
    minQuality: 55,
  },
  categoryImage: {
    maxWidth: 320,
    maxHeight: 320,
    quality: 80,
    targetMaxBytes: 80 * 1024,
    minQuality: 55,
  },
  menuBg: {
    maxWidth: 1920,
    maxHeight: 2560,
    quality: 78,
    targetMaxBytes: 150 * 1024,
    minQuality: 50,
  },
  welcomeBg: {
    maxWidth: 1920,
    maxHeight: 2560,
    quality: 78,
    targetMaxBytes: 150 * 1024,
    minQuality: 50,
  },
}

const OPTIMIZABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Max upload size before optimization (raw file from client) */
export const MAX_RAW_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024
export const MAX_WELCOME_VIDEO_BYTES = 10 * 1024 * 1024
export const MAX_WELCOME_VIDEO_WIDTH = 1920
export const MAX_WELCOME_VIDEO_HEIGHT = 1080

export function isOptimizableImage(contentType: string): boolean {
  return OPTIMIZABLE_IMAGE_TYPES.has(contentType)
}

export function isVideoContentType(contentType: string): boolean {
  return contentType === 'video/mp4'
}

export function replaceKeyExtension(key: string, extension: string): string {
  if (/\.[^./]+$/.test(key)) {
    return key.replace(/\.[^./]+$/, `.${extension}`)
  }
  return `${key}.${extension}`
}

export async function optimizeImage(
  input: Buffer,
  scope: MediaScope,
  contentType: string
): Promise<OptimizedMedia> {
  const profile = SCOPE_PROFILES[scope]
  const originalSize = input.length

  const metadata = await sharp(input, { failOn: 'none' }).rotate().metadata()
  const hasAlpha = metadata.hasAlpha === true

  const encode = async (quality: number): Promise<Buffer> => {
    return sharp(input, { failOn: 'none' })
      .rotate()
      .resize(profile.maxWidth, profile.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
        ...(hasAlpha ? { alphaQuality: quality } : {}),
      })
      .toBuffer()
  }

  let quality = profile.quality
  let buffer = await encode(quality)

  while (buffer.length > profile.targetMaxBytes && quality > profile.minQuality) {
    quality -= 5
    buffer = await encode(quality)
  }

  const outputMeta = await sharp(buffer).metadata()

  return {
    buffer,
    contentType: 'image/webp',
    extension: 'webp',
    originalSize,
    optimizedSize: buffer.length,
    width: outputMeta.width,
    height: outputMeta.height,
  }
}

/**
 * Validate welcome background MP4 uploads.
 * Server-side transcoding is not available on this stack; enforce sensible limits instead.
 */
export function validateWelcomeVideo(buffer: Buffer): VideoValidationResult {
  if (buffer.length > MAX_WELCOME_VIDEO_BYTES) {
    return {
      valid: false,
      error: `Video must be under ${MAX_WELCOME_VIDEO_BYTES / (1024 * 1024)}MB. Compress your video before uploading (HandBrake, FFmpeg, or an online MP4 compressor).`,
    }
  }

  if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
    return { valid: false, error: 'Invalid MP4 file.' }
  }

  const dimensions = parseMp4Dimensions(buffer)

  if (
    dimensions.width &&
    dimensions.height &&
    (dimensions.width > MAX_WELCOME_VIDEO_WIDTH || dimensions.height > MAX_WELCOME_VIDEO_HEIGHT)
  ) {
    return {
      valid: false,
      error: `Video resolution ${dimensions.width}×${dimensions.height} exceeds the maximum ${MAX_WELCOME_VIDEO_WIDTH}×${MAX_WELCOME_VIDEO_HEIGHT}. Re-encode at 1080p or lower.`,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  if (buffer.length > 5 * 1024 * 1024) {
    return {
      valid: true,
      recommendation: `Video is ${(buffer.length / (1024 * 1024)).toFixed(1)}MB. For faster welcome page loads, aim for under 5MB at 1080p.`,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  return {
    valid: true,
    width: dimensions.width,
    height: dimensions.height,
  }
}

function parseMp4Dimensions(buffer: Buffer): { width?: number; height?: number } {
  let offset = 0

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    if (size < 8) break

    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const boxEnd = Math.min(buffer.length, offset + size)

    if (type === 'tkhd' && boxEnd - offset >= 92) {
      const contentStart = offset + 8
      const version = buffer[contentStart]
      const widthOffset = version === 1 ? contentStart + 96 : contentStart + 84
      const heightOffset = widthOffset + 4

      if (heightOffset + 4 <= boxEnd) {
        const width = buffer.readUInt32BE(widthOffset) / 65536
        const height = buffer.readUInt32BE(heightOffset) / 65536
        if (width > 0 && height > 0) {
          return { width: Math.round(width), height: Math.round(height) }
        }
      }
    }

    offset += size > 0 ? size : 8
  }

  return {}
}
