import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ALLOW: Next.js internal routes
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // ALLOW: Static assets and API routes
  if (pathname.startsWith('/assets/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/data/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ALLOW: Static files
  if (
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // ALLOW: Root "/" - return 404 (handled by app/page.tsx)
  if (pathname === '/') {
    return NextResponse.next()
  }

  // ALLOW: ONLY Legends slug
  if (pathname === '/legends-restaurant') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/legends-restaurant/')) {
    return NextResponse.next()
  }

  // BLOCK: Everything else - return 404
  return new NextResponse(null, { status: 404 })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled in middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image).*)',
  ],
}
