'use client'

import { useEffect } from 'react'
import { generateColorScheme, normalizeToHex } from '@/lib/color-utils'

export function ThemeProvider() {
  useEffect(() => {
    // Fetch theme and apply CSS variables with retry
    const applyTheme = async (retryCount = 0) => {
      try {
        const response = await fetch('/data/theme')
        if (response.ok) {
          const data = await response.json()
          if (data.theme) {
            const theme = data.theme
            
            // Apply background color via CSS variable
            document.documentElement.style.setProperty('--app-bg', theme.appBg)
            
            // Generate and apply complementary color scheme (always based on selected color)
            const hexColor = normalizeToHex(theme.appBg)
            const colorScheme = generateColorScheme(hexColor)
            
            // Apply all generated colors as CSS variables
            Object.entries(colorScheme).forEach(([key, value]) => {
              let varName = `--auto-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
              // Fix edgeAccent conversion (edgeAccent -> edge-accent, not edge-ccent)
              if (key === 'edgeAccent') {
                varName = '--auto-edge-accent'
              }
              // Fix lighterSurface conversion
              if (key === 'lighterSurface') {
                varName = '--auto-lighter-surface'
              }
              document.documentElement.style.setProperty(varName, value)
            })
          }
        }
      } catch (error) {
        console.error('Error applying theme:', error)
        if (retryCount < 1) {
          setTimeout(() => applyTheme(retryCount + 1), 500)
        }
      }
    }

    applyTheme()
    
    // Listen for theme changes (for preview mode in admin)
    const handleThemeUpdate = () => {
      applyTheme()
    }
    window.addEventListener('theme-updated', handleThemeUpdate)
    
    return () => {
      window.removeEventListener('theme-updated', handleThemeUpdate)
    }
  }, [])

  return null
}

