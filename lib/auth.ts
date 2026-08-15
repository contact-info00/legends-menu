import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 60 * 60 * 1000 // 1 hour (in milliseconds)
const SESSION_MAX_AGE = 3600 // 1 hour (in seconds)

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export interface AdminSessionData {
  restaurantId: string
  adminUserId: string
  issuedAt: number // Timestamp in milliseconds
}

export async function createAdminSession(restaurantId: string, adminUserId: string) {
  const cookieStore = await cookies()
  const now = Date.now()
  const sessionData: AdminSessionData = { 
    restaurantId, 
    adminUserId,
    issuedAt: now // Store when session was created
  }
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE, // 1 hour
  })
}

export async function getAdminSession(): Promise<AdminSessionData | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)
  if (!session?.value) {
    return null
  }
  try {
    const sessionData = JSON.parse(session.value) as AdminSessionData
    
    // Validate session expiry (server-side check)
    const now = Date.now()
    const issuedAt = sessionData.issuedAt || 0 // Fallback for old sessions
    const elapsed = now - issuedAt
    
    // If session is older than 1 hour, it's expired
    if (elapsed >= SESSION_DURATION) {
      // Clear expired session
      await deleteAdminSession()
      return null
    }
    
    // Ensure issuedAt is present (migrate old sessions)
    if (!sessionData.issuedAt) {
      sessionData.issuedAt = now
      cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
      })
    }
    
    return sessionData
  } catch {
    return null
  }
}

// Custom error class for session expiry
export class SessionExpiredError extends Error {
  constructor(message: string = 'SESSION_EXPIRED') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

// Cache restaurant existence/slug so session polls and requireAdminSession do not each
// hit Postgres on every call. Cookie expiry is still checked on every request.
const restaurantCache = new Map<
  string,
  { exists: boolean; slug: string | null; checkedAt: number }
>()
const RESTAURANT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function pruneRestaurantCache() {
  if (restaurantCache.size <= 100) return
  const entries = Array.from(restaurantCache.entries())
  entries.sort((a, b) => b[1].checkedAt - a[1].checkedAt)
  restaurantCache.clear()
  entries.slice(0, 100).forEach(([id, data]) => restaurantCache.set(id, data))
}

/**
 * Resolve the restaurant for an admin session, with a short in-memory cache.
 * Used by check-session (needs slug) and requireAdminSession (needs existence).
 */
export async function getAdminSessionRestaurant(
  restaurantId: string
): Promise<{ id: string; slug: string } | null> {
  const cached = restaurantCache.get(restaurantId)
  const now = Date.now()

  if (cached && now - cached.checkedAt < RESTAURANT_CACHE_TTL) {
    if (!cached.exists || !cached.slug) {
      return null
    }
    return { id: restaurantId, slug: cached.slug }
  }

  const { prisma } = await import('@/lib/prisma')
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, slug: true },
  })

  restaurantCache.set(restaurantId, {
    exists: !!restaurant,
    slug: restaurant?.slug ?? null,
    checkedAt: now,
  })
  pruneRestaurantCache()

  return restaurant
}

export async function requireAdminSession(): Promise<AdminSessionData> {
  const session = await getAdminSession()
  if (!session) {
    // Clear cookie if session is expired
    await deleteAdminSession()
    throw new SessionExpiredError('SESSION_EXPIRED')
  }

  const restaurant = await getAdminSessionRestaurant(session.restaurantId)
  if (!restaurant) {
    await deleteAdminSession()
    throw new Error('Restaurant not found: This restaurant has been deleted')
  }

  return session
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
}

// Super Admin Session functions
const SUPER_ADMIN_SESSION_COOKIE = 'super_admin_session'
const SUPER_ADMIN_PIN = '1244'

export async function createSuperAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(SUPER_ADMIN_SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
  })
}

export async function getSuperAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)
  return session?.value === 'authenticated'
}

export async function deleteSuperAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE)
}

export function getSuperAdminPin(): string {
  // Use environment variable if set, otherwise fallback to hardcoded PIN
  return process.env.SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PIN
}

// Simple rate limiting (in-memory)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const RESET_TIME = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RESET_TIME })
    return { allowed: true }
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return { allowed: false, resetIn: attempt.resetAt - now }
  }

  attempt.count++
  return { allowed: true }
}




