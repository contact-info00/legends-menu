'use client'

import { useEffect } from 'react'

export function BrandColorsProvider() {
  useEffect(() => {
    // Extract slug from current pathname
    const pathname = window.location.pathname
    const slugMatch = pathname.match(/^\/([^\/]+)/)
    const slug = slugMatch ? slugMatch[1] : 'legends-restaurant' // Default fallback

    // Fetch brand colors and apply them with retry
    const fetchBrandColors = async (retryCount = 0) => {
      try {
        const res = await fetch(`/data/restaurant?slug=${slug}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (data.brandColors) {
          const colors = data.brandColors
          Object.entries(colors).forEach(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
            document.documentElement.style.setProperty(`--${cssKey}`, String(value))
          })
        }
      } catch (error) {
        console.error('Error fetching brand colors:', error)
        if (retryCount < 1) {
          setTimeout(() => fetchBrandColors(retryCount + 1), 500)
        }
      }
    }
    fetchBrandColors()
  }, [])

  return null
}




