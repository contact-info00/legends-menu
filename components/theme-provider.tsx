'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  applyThemeToDocument,
  consumeInitialThemePayload,
  fetchThemeData,
  getPublicSlugFromPathname,
  isPublicRestaurantPath,
  readCachedAppBg,
  seedThemeClientCache,
  THEME_UPDATED_EVENT,
  writeCachedAppBg,
} from '@/lib/theme-client'

export function ThemeProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isPublicRestaurantPath(pathname || '')) {
      return
    }

    const slug = getPublicSlugFromPathname(pathname || window.location.pathname)
    if (!slug) return

    let cancelled = false

    const applyPayload = (theme: { appBg: string }) => {
      applyThemeToDocument(theme)
      writeCachedAppBg(slug, theme.appBg)
    }

    const cachedAppBg = readCachedAppBg(slug)
    if (cachedAppBg) {
      applyThemeToDocument({ appBg: cachedAppBg })
    }

    const loadTheme = async (bypassCache = false) => {
      const data = await fetchThemeData(slug, { bypassCache })
      if (cancelled || !data?.theme) return
      applyPayload(data.theme)
    }

    const initialPayload = consumeInitialThemePayload()
    if (initialPayload?.theme) {
      applyPayload(initialPayload.theme)
      seedThemeClientCache(slug, initialPayload)
    } else {
      void loadTheme(false)
    }

    const handleThemeUpdate = () => {
      void loadTheme(true)
    }

    window.addEventListener(THEME_UPDATED_EVENT, handleThemeUpdate)

    return () => {
      cancelled = true
      window.removeEventListener(THEME_UPDATED_EVENT, handleThemeUpdate)
    }
  }, [pathname])

  return null
}
