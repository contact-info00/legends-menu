import { revalidatePath, revalidateTag } from 'next/cache'

/** Invalidate server caches after restaurant settings or theme changes. */
export function invalidateRestaurantCaches(restaurantId: string, slug?: string) {
  revalidateTag('admin-bootstrap')
  revalidateTag('theme')
  revalidateTag('settings')
  revalidateTag('menu')
  revalidateTag('menu-bootstrap')
  revalidateTag('menu-items')
  revalidateTag('ui-settings')
  revalidateTag('restaurant-data')
  revalidateTag(`restaurant-${restaurantId}`)
  revalidateTag(`restaurant-data-${restaurantId}`)
  if (slug) {
    revalidateTag(`restaurant-slug-${slug}`)
    revalidateTag(`restaurant-data-slug-${slug}`)
    revalidateTag(`theme-slug-${slug}`)
    revalidateTag(`welcome-${slug}`)
    revalidatePath(`/${slug}`)
    revalidatePath(`/${slug}/menu`)
  }
}

/** Invalidate menu-related caches after menu builder changes. */
export function invalidateMenuDataCaches(restaurantId: string) {
  revalidateTag('menu')
  revalidateTag('menu-bootstrap')
  revalidateTag('menu-items')
  revalidateTag('advanced-options')
  revalidateTag(`restaurant-${restaurantId}`)
}

/** Invalidate global platform settings cache (footer logo, etc.). */
export function invalidatePlatformSettingsCache() {
  revalidateTag('platform-settings')
}
