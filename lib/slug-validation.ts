/** Edge-safe slug helpers — no Prisma or Node-only imports. */

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

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' }
  }

  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot have consecutive hyphens' }
  }

  if (isReservedSlug(slug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' }
  }

  return { valid: true }
}
