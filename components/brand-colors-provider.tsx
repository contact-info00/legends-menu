'use client'

import { useEffect } from 'react'

export function BrandColorsProvider() {
  useEffect(() => {
    // Fetch brand colors and apply them
    fetch('/api/restaurant')
      .then((res) => res.json())
      .then((data) => {
        if (data.brandColors) {
          const colors = data.brandColors
          Object.entries(colors).forEach(([key, value]) => {
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
            document.documentElement.style.setProperty(`--${cssKey}`, String(value))
          })
        }
      })
      .catch(console.error)
  }, [])

  return null
}




