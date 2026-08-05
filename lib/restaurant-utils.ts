import { prisma } from '@/lib/prisma'

export { isReservedSlug, validateSlug } from '@/lib/slug-validation'

export async function getRestaurantBySlug(slug: string) {
  try {
    try {
      return await prisma.restaurant.findUnique({
        where: { slug },
      })
    } catch (error: any) {
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
