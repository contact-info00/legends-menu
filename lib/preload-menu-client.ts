import type { Language } from '@/lib/i18n'

interface BootstrapResponse {
  restaurant: { logoR2Url?: string | null } | null
  theme: { menuBackgroundR2Url?: string | null } | null
}

const MAX_PRELOAD_MS = 15000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

/**
 * Warm menu data, RSC payload, and critical images while navigating from welcome.
 * Does not block navigation — call without await before router.push().
 */
export async function preloadMenuForNavigation(
  slug: string,
  lang: Language,
  onProgress?: (value: number) => void
): Promise<void> {
  const report = (value: number) => onProgress?.(Math.min(1, Math.max(0, value)))

  const menuPath = `/${slug}/menu?lang=${lang}`

  const preloadWork = async () => {
    report(0.05)

    const pageFetch = fetch(menuPath, {
      credentials: 'same-origin',
      headers: {
        RSC: '1',
        'Next-Router-Prefetch': '1',
      },
    }).catch(() => fetch(menuPath, { credentials: 'same-origin' }))

    const [bootstrapRes] = await Promise.all([
      fetch(`/api/${slug}/public/menu-bootstrap`, { credentials: 'same-origin' }),
      pageFetch,
      fetch('/api/platform-settings', { credentials: 'same-origin' }).catch(() => null),
    ])

    report(0.35)

    let bootstrap: BootstrapResponse | null = null
    if (bootstrapRes.ok) {
      bootstrap = await bootstrapRes.json()
    }

    const imageUrls: string[] = []
    if (bootstrap?.theme?.menuBackgroundR2Url) {
      imageUrls.push(bootstrap.theme.menuBackgroundR2Url)
    }
    if (bootstrap?.restaurant?.logoR2Url) {
      imageUrls.push(bootstrap.restaurant.logoR2Url)
    }

    report(0.65)

    if (imageUrls.length > 0) {
      let loaded = 0
      await Promise.all(
        imageUrls.map(async (url) => {
          await preloadImage(url)
          loaded += 1
          report(0.65 + (loaded / imageUrls.length) * 0.35)
        })
      )
    }

    report(1)
  }

  await Promise.race([preloadWork(), delay(MAX_PRELOAD_MS).then(() => report(1))])
}
