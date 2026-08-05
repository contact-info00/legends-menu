import { NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_THEME,
  getCachedThemeForSlug,
  resolveThemeSlugFromRequest,
  THEME_CACHE_HEADERS,
  THEME_NO_STORE_HEADERS,
} from '@/lib/theme-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function GET(request: NextRequest) {
  try {
    const slug = resolveThemeSlugFromRequest(request)

    if (!slug) {
      return NextResponse.json({ theme: DEFAULT_THEME }, { headers: THEME_CACHE_HEADERS })
    }

    const result = await getCachedThemeForSlug(slug)

    if (!result) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404, headers: THEME_NO_STORE_HEADERS }
      )
    }

    return NextResponse.json(result, { headers: THEME_CACHE_HEADERS })
  } catch (error) {
    console.error('Error fetching theme:', error)
    return NextResponse.json({ theme: DEFAULT_THEME }, { headers: THEME_CACHE_HEADERS })
  }
}
