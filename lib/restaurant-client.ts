'use client'

/**
 * Shared client access to /data/restaurant.
 *
 * Several independent components need this record on the same page (brand colours from the root
 * layout, the menu header and service charge from the menu client). Without a shared entry point
 * each of them opens its own request for a payload that is identical, so this mirrors the
 * deduplication that theme-client.ts already does for /data/theme.
 */

const CLIENT_CACHE_TTL_MS = 30_000

export interface PublicRestaurantData {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  logoMediaId?: string | null
  logoR2Url?: string | null
  serviceChargePercent?: number | string | null
  brandColors?: Record<string, unknown> | null
}

// A `null` entry records a restaurant the server reported as missing, so callers that retry do
// not reopen a request for a slug that is known not to exist.
const clientCache = new Map<string, { data: PublicRestaurantData | null; ts: number }>()
const inflight = new Map<string, Promise<PublicRestaurantData | null>>()

export function clearRestaurantClientCache(slug?: string): void {
  if (slug) {
    clientCache.delete(slug)
    inflight.delete(slug)
    return
  }
  clientCache.clear()
  inflight.clear()
}

/**
 * Deduplicated client fetch for /data/restaurant.
 *
 * `bypassCache` drops the stored copy so admin edits show up immediately, but it still joins a
 * request that is already in flight — that one is going to resolve with fresh data anyway.
 */
export async function fetchPublicRestaurant(
  slug: string,
  options?: { bypassCache?: boolean }
): Promise<PublicRestaurantData | null> {
  if (!slug) return null

  if (options?.bypassCache) {
    clientCache.delete(slug)
  } else {
    const cached = clientCache.get(slug)
    if (cached && Date.now() - cached.ts < CLIENT_CACHE_TTL_MS) {
      return cached.data
    }
  }

  const existing = inflight.get(slug)
  if (existing) return existing

  const url = options?.bypassCache
    ? `/data/restaurant?slug=${encodeURIComponent(slug)}&t=${Date.now()}`
    : `/data/restaurant?slug=${encodeURIComponent(slug)}`

  // `missing` separates "the server says this slug does not exist" from a transport failure, so
  // only the latter is left uncached and therefore retryable.
  const promise = fetch(url, options?.bypassCache ? { cache: 'no-store' } : undefined)
    .then(async (response) => {
      if (response.status === 404) return { missing: true as const }
      if (!response.ok) return null
      return (await response.json()) as PublicRestaurantData
    })
    .catch(() => null)
    .then((result) => {
      if (result && 'missing' in result) {
        clientCache.set(slug, { data: null, ts: Date.now() })
        return null
      }
      if (result) {
        clientCache.set(slug, { data: result, ts: Date.now() })
      }
      return result
    })

  inflight.set(slug, promise)

  try {
    return await promise
  } finally {
    inflight.delete(slug)
  }
}
