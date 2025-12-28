import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Exclude these paths from rewrite
  const excludedPaths = [
    '/menu',
    '/admin-portal',
    '/api',
    '/login',
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ]

  // Check if path starts with any excluded prefix
  const isExcluded = excludedPaths.some((excluded) => {
    if (excluded === pathname) return true
    if (pathname.startsWith(excluded + '/')) return true
    return false
  })

  // Check if it's a static file (has extension)
  const hasExtension = /\.(ico|png|jpg|jpeg|gif|svg|css|js|json|xml|txt|woff|woff2|ttf|eot)$/i.test(pathname)

  // If excluded or has extension, don't rewrite
  if (isExcluded || hasExtension) {
    return NextResponse.next()
  }

  // If path is root, don't rewrite (keep existing behavior)
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Rewrite /:slug to /welcome/:slug
  // Extract slug (everything after /)
  const slug = pathname.slice(1) // Remove leading /

  // Only rewrite if slug is not empty and doesn't contain slashes (single level)
  if (slug && !slug.includes('/')) {
    const url = request.nextUrl.clone()
    url.pathname = `/welcome/${slug}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

