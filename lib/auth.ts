import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 0 // No persistence - require PIN every time

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function createAdminSession() {
  const cookieStore = await cookies()
  // Set session with very short duration (5 seconds) - just enough for immediate redirect
  // This ensures PIN is required every time the admin dashboard is accessed
  cookieStore.set(ADMIN_SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5, // 5 seconds - expires almost immediately
  })
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)
  return session?.value === 'authenticated'
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
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




