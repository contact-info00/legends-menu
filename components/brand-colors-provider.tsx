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
        const res = await fetch(`/data/restaurant?slug=${slug}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          // Don't retry on 404 or 400 errors
          if (res.status === 404 || res.status === 400) {
            return
          }
          throw new Error(`Failed to fetch: ${res.status}`)
        }
        const data = await res.json()
        if (data.brandColors) {
          const colors = data.brandColors
          Object.entries(colors).forEach(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
            document.documentElement.style.setProperty(`--${cssKey}`, String(value))
          })
        }
      } catch (error) {
        // Only log errors in development, and retry up to 2 times with exponential backoff
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching brand colors:', error)
        }
        if (retryCount < 2) {
          const delay = Math.min(500 * Math.pow(2, retryCount), 2000) // Exponential backoff: 500ms, 1000ms, 2000ms max
          setTimeout(() => fetchBrandColors(retryCount + 1), delay)
        }
      }
    }
    fetchBrandColors()
  }, [])

  return null
}




