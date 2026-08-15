import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isReservedSlug } from '@/lib/slug-validation'

/** Forward pathname so root layout can skip the legacy ui-settings DB query on customer routes. */
function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

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
    return nextWithPathname(request)
  }

  // 2) ALWAYS ALLOW: Static assets and API routes
  if (pathname.startsWith('/assets')) {
    return nextWithPathname(request)
  }

  if (pathname.startsWith('/data')) {
    return nextWithPathname(request)
  }

  if (pathname.startsWith('/api')) {
    return nextWithPathname(request)
  }

  // 3) ALWAYS ALLOW: Static files
  if (
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return nextWithPathname(request)
  }

  // 4) ALLOW: Root "/" - return 404 (handled by app/page.tsx)
  if (pathname === '/') {
    return nextWithPathname(request)
  }

  // 5) Super admin — canonical route only; redirect legacy /[slug]/super-admin
  const pathSegments = pathname.split('/').filter(Boolean)
  if (pathSegments.length >= 2 && pathSegments[1] === 'super-admin') {
    const rest = pathSegments.slice(2).join('/')
    const redirectPath = rest ? `/super-admin/${rest}` : '/super-admin'
    return NextResponse.redirect(new URL(redirectPath, request.url), 308)
  }

  if (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) {
    return nextWithPathname(request)
  }

  // 6) Redirect legacy /[slug]/admin routes to /[slug]/admin-portal
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
  return nextWithPathname(request)
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
