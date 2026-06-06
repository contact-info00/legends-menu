import { revalidateTag } from 'next/cache'

/** Invalidate server caches after restaurant settings or theme changes. */
export function invalidateRestaurantCaches(restaurantId: string, slug?: string) {
  revalidateTag('admin-bootstrap')
  revalidateTag('theme')
  revalidateTag('settings')
  revalidateTag('menu')
  revalidateTag('menu-bootstrap')
  revalidateTag(`restaurant-${restaurantId}`)
  if (slug) {
    revalidateTag(`restaurant-slug-${slug}`)
  }
}
