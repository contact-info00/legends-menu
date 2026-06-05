import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isReservedSlug } from '@/lib/restaurant-utils'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // Redirect www to apex domain (menuzin.com)
  if (host === 'www.menuzin.com') {
    const url = request.nextUrl.clone()
    url.host = 'menuzin.com'
    return NextResponse.redirect(url, 308)
  }

  // 1) ALWAYS ALLOW: Next.js internal routes
  if (pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // 2) ALWAYS ALLOW: Static assets and API routes
  if (pathname.startsWith('/assets')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/data')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 3) ALWAYS ALLOW: Static files
  if (
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // 4) ALLOW: Root "/" - return 404 (handled by app/page.tsx)
  if (pathname === '/') {
    return NextResponse.next()
  }

  // 5) ALLOW: Super admin route (no slug only)
  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) {
    // Block if there's a slug before super-admin (e.g., /[slug]/super-admin)
    const pathSegments = pathname.split('/').filter(Boolean)
    // If path has more than 2 segments and second segment is 'super-admin', it means there's a slug
    // Example: /legends-restaurant/super-admin -> ['legends-restaurant', 'super-admin']
    if (pathSegments.length >= 2 && pathSegments[1] === 'super-admin') {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // 6) Redirect legacy /[slug]/admin routes to /[slug]/admin-portal
  const pathSegments = pathname.split('/').filter(Boolean)
  if (pathSegments.length >= 2 && pathSegments[1] === 'admin') {
    const rest = pathSegments.slice(2).join('/')
    const redirectPath = rest
      ? `/${pathSegments[0]}/admin-portal/${rest}`
      : `/${pathSegments[0]}/admin-portal`
    return NextResponse.redirect(new URL(redirectPath, request.url), 308)
  }

  // 7) Check for reserved slugs in first path segment
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0]
    
    // Block reserved slugs at root level
    if (isReservedSlug(firstSegment)) {
      return new NextResponse(null, { status: 404 })
    }
  }

  // 8) ALLOW: All other routes (dynamic slug routes will be validated in page/API handlers)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
