'use client'

import { generateColorScheme, normalizeToHex } from '@/lib/color-utils'
import type { PublicTheme, ThemePayload } from '@/lib/theme-server'

export const THEME_UPDATED_EVENT = 'theme-updated'
export const THEME_APP_BG_STORAGE_PREFIX = 'theme-appBg-'

const CLIENT_CACHE_TTL_MS = 30_000

const clientCache = new Map<string, { data: ThemePayload; ts: number }>()
const inflight = new Map<string, Promise<ThemePayload | null>>()

export function getPublicSlugFromPathname(pathname: string): string | null {
  const pathParts = pathname.split('/').filter(Boolean)
  if (pathParts.length === 0) return null
  if (pathParts[0] === 'super-admin' || pathParts[0] === 'admin') return null
  return pathParts[0]
}

export function isPublicRestaurantPath(pathname: string): boolean {
  const slug = getPublicSlugFromPathname(pathname)
  if (!slug) return false
  return !pathname.includes('/admin-portal')
}

export function readCachedAppBg(slug: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(`${THEME_APP_BG_STORAGE_PREFIX}${slug}`)
  } catch {
    return null
  }
}

export function writeCachedAppBg(slug: string, appBg: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${THEME_APP_BG_STORAGE_PREFIX}${slug}`, appBg)
    localStorage.removeItem('theme-appBg')
  } catch {
    // localStorage unavailable
  }
}

export function applyAppBgTheme(appBg: string): void {
  if (typeof document === 'undefined') return

  document.documentElement.style.setProperty('--app-bg', appBg)
  document.body.style.backgroundColor = appBg
  document.documentElement.style.backgroundColor = appBg

  const hexColor = normalizeToHex(appBg)
  const colorScheme = generateColorScheme(hexColor)

  Object.entries(colorScheme).forEach(([key, value]) => {
    let varName = `--auto-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    if (key === 'edgeAccent') varName = '--auto-edge-accent'
    if (key === 'lighterSurface') varName = '--auto-lighter-surface'
    document.documentElement.style.setProperty(varName, value)
  })
}

export function applyThemeToDocument(theme: Pick<PublicTheme, 'appBg'>): void {
  if (!theme?.appBg) return
  applyAppBgTheme(theme.appBg)
}

export function applyMenuThemeCssVariables(theme: Partial<PublicTheme> | null | undefined): void {
  if (typeof document === 'undefined' || !theme) return

  document.documentElement.style.removeProperty('--item-name-text-color')
  document.documentElement.style.removeProperty('--item-price-text-color')
  document.documentElement.style.removeProperty('--item-description-text-color')
  document.documentElement.style.removeProperty('--bottom-nav-section-name-color')
  document.documentElement.style.removeProperty('--category-name-color')
  document.documentElement.style.removeProperty('--header-footer-bg-color')
  document.documentElement.style.removeProperty('--glass-tint-color')

  if (theme.itemNameTextColor) {
    document.documentElement.style.setProperty('--item-name-text-color', theme.itemNameTextColor)
  }
  if (theme.itemPriceTextColor) {
    document.documentElement.style.setProperty('--item-price-text-color', theme.itemPriceTextColor)
  }
  if (theme.itemDescriptionTextColor) {
    document.documentElement.style.setProperty('--item-description-text-color', theme.itemDescriptionTextColor)
  }
  if (theme.bottomNavSectionNameColor) {
    document.documentElement.style.setProperty('--bottom-nav-section-name-color', theme.bottomNavSectionNameColor)
  }
  if (theme.categoryNameColor) {
    document.documentElement.style.setProperty('--category-name-color', theme.categoryNameColor)
  }
  if (theme.headerFooterBgColor) {
    document.documentElement.style.setProperty('--header-footer-bg-color', theme.headerFooterBgColor)
  }
  if (theme.glassTintColor) {
    document.documentElement.style.setProperty('--glass-tint-color', theme.glassTintColor)
  }
}

export function clearThemeClientCache(slug?: string): void {
  if (slug) {
    clientCache.delete(slug)
    inflight.delete(slug)
    return
  }
  clientCache.clear()
  inflight.clear()
}

declare global {
  interface Window {
    __INITIAL_THEME__?: ThemePayload
  }
}

export function consumeInitialThemePayload(): ThemePayload | null {
  if (typeof window === 'undefined') return null
  const payload = window.__INITIAL_THEME__
  if (payload?.theme) {
    delete window.__INITIAL_THEME__
    return payload
  }
  return null
}

export function seedThemeClientCache(slug: string, payload: ThemePayload): void {
  clientCache.set(slug, { data: payload, ts: Date.now() })
}

/** Deduplicated client fetch for /data/theme. */
export async function fetchThemeData(
  slug: string,
  options?: { bypassCache?: boolean }
): Promise<ThemePayload | null> {
  if (options?.bypassCache) {
    clientCache.delete(slug)
    inflight.delete(slug)
  } else {
    const cached = clientCache.get(slug)
    if (cached && Date.now() - cached.ts < CLIENT_CACHE_TTL_MS) {
      return cached.data
    }
    const existing = inflight.get(slug)
    if (existing) return existing
  }

  const url = options?.bypassCache
    ? `/data/theme?slug=${encodeURIComponent(slug)}&_=${Date.now()}`
    : `/data/theme?slug=${encodeURIComponent(slug)}`

  const promise = fetch(url, options?.bypassCache ? { cache: 'no-store' } : undefined)
    .then(async (response) => {
      if (!response.ok) return null
      const data = (await response.json()) as ThemePayload
      if (!data?.theme) return null
      return data
    })
    .catch(() => null)

  inflight.set(slug, promise)

  try {
    const data = await promise
    if (data) {
      clientCache.set(slug, { data, ts: Date.now() })
    }
    return data
  } finally {
    inflight.delete(slug)
  }
}
