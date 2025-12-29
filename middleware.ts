import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // 5) ALLOW: ONLY Legends restaurant pages
  if (pathname === '/legends-restaurant') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/legends-restaurant/')) {
    return NextResponse.next()
  }

  // 6) BLOCK: Everything else - return 404
  return new NextResponse(null, { status: 404 })
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
