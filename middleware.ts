import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ALLOW: Next.js internal routes
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // ALLOW: Static assets and API routes
  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/data/') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  // ALLOW: Static files
  if (
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.(ico|png|jpg|jpeg|gif|svg|css|js|json|xml|txt|woff|woff2|ttf|eot|webp|mp4)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ALLOW: Root "/" - return 404 (handled by app/page.tsx)
  if (pathname === '/') {
    return NextResponse.next()
  }

  // ALLOW: Slug-prefixed routes (e.g., /legends-restaurant, /legends-restaurant/menu, /any-slug/anything)
  // Pattern: /[slug] or /[slug]/*
  const slugPattern = /^\/[^\/]+(\/.*)?$/
  if (slugPattern.test(pathname)) {
    return NextResponse.next()
  }

  // BLOCK: All other top-level routes (return 404)
  // This blocks routes like /menu, /login, /admin-portal, /pricing, /about, etc.
  // These should belong to the platform project, not this digital-menu project
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
