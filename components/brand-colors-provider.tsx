'use client'

import { useEffect } from 'react'
import { fetchPublicRestaurant } from '@/lib/restaurant-client'

export function BrandColorsProvider() {
  useEffect(() => {
    // Extract slug from current pathname
    const pathname = window.location.pathname
    const slugMatch = pathname.match(/^\/([^\/]+)/)
    const slug = slugMatch ? slugMatch[1] : 'legends-restaurant' // Default fallback

    // Skip fetching brand colors for super-admin routes (they use black theme)
    if (slug === 'super-admin' || pathname.startsWith('/super-admin')) {
      return
    }

    // Fetch brand colors and apply them with retry
    const fetchBrandColors = async (retryCount = 0) => {
      const data = await fetchPublicRestaurant(slug)

      if (!data) {
        if (retryCount < 1) {
          setTimeout(() => fetchBrandColors(retryCount + 1), 500)
        }
        return
      }

      if (data.brandColors) {
        Object.entries(data.brandColors).forEach(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
          document.documentElement.style.setProperty(`--${cssKey}`, String(value))
        })
      }
    }
    void fetchBrandColors()
  }, [])

  return null
}




