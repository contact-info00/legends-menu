import { prisma } from '@/lib/prisma'

const RESERVED_SLUGS = [
  'super-admin',
  'admin',
  'api',
  'auth',
  'login',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'assets',
  'data',
  '_next',
]

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}

export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug is required' }
  }

  if (slug.length < 2 || slug.length > 50) {
    return { valid: false, error: 'Slug must be between 2 and 50 characters' }
  }

  // Only allow lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' }
  }

  // Cannot have consecutive hyphens
  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot have consecutive hyphens' }
  }

  if (isReservedSlug(slug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' }
  }

  return { valid: true }
}

export async function getRestaurantBySlug(slug: string) {
  try {
    try {
      return await prisma.restaurant.findUnique({
        where: { slug },
      })
    } catch (error: any) {
      // If query fails due to missing columns (P2022), use raw SQL fallback
      if (error?.code === 'P2022') {
        console.warn('[DB COMPAT] Prisma query failed, using raw SQL fallback:', error.message)
        const rawResult = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, slug, "nameKu", "nameEn", "nameAr"
           FROM "Restaurant"
           WHERE slug = '${slug.replace(/'/g, "''")}'`
        )
        return rawResult && rawResult.length > 0 ? rawResult[0] : null
      }
      throw error
    }
  } catch (error) {
    console.error('[ERROR] Error fetching restaurant by slug:', error)
    return null
  }
}

export async function requireRestaurantBySlug(slug: string) {
  const restaurant = await getRestaurantBySlug(slug)
  if (!restaurant) {
    throw new Error('Restaurant not found')
  }
  return restaurant
}

