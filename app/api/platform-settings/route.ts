import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
}

async function fetchPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'platform-1' },
    select: {
      footerLogoR2Key: true,
      footerLogoR2Url: true,
    },
  })

  if (!settings) {
    return {
      footerLogoR2Key: null,
      footerLogoR2Url: null,
    }
  }

  return {
    footerLogoR2Key: settings.footerLogoR2Key,
    footerLogoR2Url: settings.footerLogoR2Url,
  }
}

const getCachedPlatformSettings = unstable_cache(
  fetchPlatformSettings,
  ['platform-settings'],
  {
    tags: ['platform-settings'],
    revalidate: 300,
  }
)

export async function GET(request: NextRequest) {
  try {
    const settings = await getCachedPlatformSettings()

    return NextResponse.json(settings, {
      headers: PUBLIC_CACHE_HEADERS,
    })
  } catch (error: any) {
    console.error('[PLATFORM SETTINGS GET] Error fetching platform settings:', error?.message)

    return NextResponse.json(
      {
        footerLogoR2Key: null,
        footerLogoR2Url: null,
      },
      {
        headers: PUBLIC_CACHE_HEADERS,
      }
    )
  }
}
