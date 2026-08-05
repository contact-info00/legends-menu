import { NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_THEME,
  getCachedThemeForSlug,
  THEME_CACHE_HEADERS,
} from '@/lib/theme-server'

export const revalidate = 30

function resolveSlug(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url)
  let slug = searchParams.get('slug')

  if (!slug) {
    const referer = request.headers.get('referer')
    if (referer) {
      const refererUrl = new URL(referer)
      const pathParts = refererUrl.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0 && pathParts[0] !== 'super-admin' && pathParts[0] !== 'admin') {
        slug = pathParts[0]
      }
    }
  }

  return slug
}

export async function GET(request: NextRequest) {
  try {
    const slug = resolveSlug(request)

    if (!slug) {
      return NextResponse.json({ theme: DEFAULT_THEME }, { headers: THEME_CACHE_HEADERS })
    }

    const result = await getCachedThemeForSlug(slug)
    return NextResponse.json(result ?? { theme: DEFAULT_THEME }, { headers: THEME_CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching theme:', error)
    return NextResponse.json({ theme: DEFAULT_THEME }, { headers: THEME_CACHE_HEADERS })
  }
}
