export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getAdminSession, getAdminSessionRestaurant, deleteAdminSession } from '@/lib/auth'

export async function GET() {
  const startTime = Date.now()
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'SESSION_EXPIRED' },
      { status: 401 }
    )
  }

  // Cookie expiry is checked above without Postgres. Restaurant existence is cached so the
  // 60s SWR poll does not become a 60s database poll.
  const restaurant = await getAdminSessionRestaurant(session.restaurantId)

  if (!restaurant) {
    await deleteAdminSession()
    return NextResponse.json(
      { authenticated: false, error: 'Restaurant not found: This restaurant has been deleted' },
      { status: 404 }
    )
  }

  const checkTime = Date.now() - startTime
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PERF] Session check: ${checkTime}ms`)
  }

  return NextResponse.json({
    authenticated: true,
    restaurantId: session.restaurantId,
    restaurantSlug: restaurant.slug,
    adminUserId: session.adminUserId,
  })
}
