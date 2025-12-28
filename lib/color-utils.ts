/**
 * Color utility functions for generating complementary colors based on background
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Calculate relative luminance of a color (0-1)
 * Used to determine if a color is light or dark
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Check if a color is light (returns true) or dark (returns false)
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5
}

/**
 * Generate a lighter or darker version of a color
 */
function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = Math.max(0, Math.min(255, rgb.r + amount))
  const g = Math.max(0, Math.min(255, rgb.g + amount))
  const b = Math.max(0, Math.min(255, rgb.b + amount))

  return rgbToHex(r, g, b)
}

/**
 * Generate a glow color from a background color
 * Creates a soft RGBA glow with appropriate opacity that matches the background
 */
function generateGlowColor(backgroundColor: string, opacity: number = 0.35): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return `rgba(64, 8, 16, ${opacity})` // Fallback to default background
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

/**
 * Generate edge accent color from background color
 * Used for left/right triangular accents on frames
 */
function generateEdgeAccentColor(backgroundColor: string, opacity: number = 0.4): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return `rgba(64, 8, 16, ${opacity})` // Fallback to default background
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

/**
 * Generate a lighter or darker surface color from background color
 * For light backgrounds: returns darker surface
 * For dark backgrounds: returns lighter surface
 */
function generateLighterSurface(backgroundColor: string, opacity: number = 0.9): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return `rgba(64, 8, 16, ${opacity})` // Fallback to default background
  
  const isLight = isLightColor(backgroundColor)
  
  if (isLight) {
    // For light backgrounds, return darker surface (black with opacity)
    return `rgba(0, 0, 0, ${opacity * 0.3})` // Darker for light backgrounds
  } else {
    // For dark backgrounds, make it slightly lighter by increasing RGB values
    const lighterR = Math.min(255, rgb.r + 20)
    const lighterG = Math.min(255, rgb.g + 20)
    const lighterB = Math.min(255, rgb.b + 20)
    return `rgba(${lighterR}, ${lighterG}, ${lighterB}, ${opacity})`
  }
}

/**
 * Generate a color scheme based on the background color
 */
export function generateColorScheme(backgroundColor: string): {
  textPrimary: string
  textSecondary: string
  surfaceBg: string
  surfaceBg2: string
  border: string
  primary: string
  primaryHover: string
  primaryText: string
  accent: string
  muted: string
  shadowColor: string
  shadowColorLight: string
  primaryGlow: string
  primaryGlowStrong: string
  primaryGlowSubtle: string
  edgeAccent: string
  lighterSurface: string
} {
  const isLight = isLightColor(backgroundColor)
  const rgb = hexToRgb(backgroundColor)

  if (!rgb) {
    // Fallback to default dark theme
    const fallbackBg = '#400810'
    const fallbackPrimary = '#800020'
    return {
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.9)',
      surfaceBg: 'rgba(255, 255, 255, 0.1)',
      surfaceBg2: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.2)',
      primary: fallbackPrimary,
      primaryHover: '#A00028',
      primaryText: '#FFFFFF',
      accent: '#FBBF24',
      muted: 'rgba(255, 255, 255, 0.5)',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowColorLight: 'rgba(0, 0, 0, 0.1)',
      primaryGlow: generateGlowColor(fallbackBg, 0.35),
      primaryGlowStrong: generateGlowColor(fallbackBg, 0.45),
      primaryGlowSubtle: generateGlowColor(fallbackBg, 0.25),
      edgeAccent: generateEdgeAccentColor(fallbackBg, 0.4),
      lighterSurface: generateLighterSurface(fallbackBg, 0.9),
    }
  }

  if (isLight) {
    // Light background - use dark text and DARKER surfaces for clear visibility
    // For light backgrounds, components should be darker to stand out
    const shadowR = Math.max(0, rgb.r - 80)
    const shadowG = Math.max(0, rgb.g - 80)
    const shadowB = Math.max(0, rgb.b - 80)
    
    const primary = adjustBrightness(backgroundColor, -60) // Much darker version for contrast
    const primaryHover = adjustBrightness(backgroundColor, -80)
    
    // Calculate how light the background is (0-1, where 1 is very light)
    const lightness = getLuminance(backgroundColor)
    // For very light backgrounds, use darker components
    const surfaceOpacity = Math.min(0.25, 0.1 + lightness * 0.15) // 0.1 to 0.25
    const surface2Opacity = Math.min(0.15, 0.05 + lightness * 0.1) // 0.05 to 0.15
    const borderOpacity = Math.min(0.4, 0.2 + lightness * 0.2) // 0.2 to 0.4
    
    return {
      textPrimary: '#000000', // Pure black for maximum contrast
      textSecondary: 'rgba(0, 0, 0, 0.8)', // Darker for better readability
      surfaceBg: `rgba(0, 0, 0, ${surfaceOpacity})`, // Darker surfaces for visibility
      surfaceBg2: `rgba(0, 0, 0, ${surface2Opacity})`, // Darker secondary surfaces
      border: `rgba(0, 0, 0, ${borderOpacity})`, // Darker borders for clear separation
      primary,
      primaryHover,
      primaryText: '#FFFFFF', // White text on dark primary buttons
      accent: adjustBrightness(backgroundColor, -50), // Darker accent
      muted: 'rgba(0, 0, 0, 0.6)', // Darker muted text
      shadowColor: `rgba(${shadowR}, ${shadowG}, ${shadowB}, 0.5)`, // Darker shadows
      shadowColorLight: `rgba(${shadowR}, ${shadowG}, ${shadowB}, 0.3)`,
      primaryGlow: generateGlowColor(backgroundColor, 0.2), // Subtle glow
      primaryGlowStrong: generateGlowColor(backgroundColor, 0.3),
      primaryGlowSubtle: generateGlowColor(backgroundColor, 0.15),
      edgeAccent: generateEdgeAccentColor(backgroundColor, 0.3), // Darker edge accents
      lighterSurface: `rgba(0, 0, 0, ${Math.min(0.3, surfaceOpacity + 0.1)})`, // Darker, not lighter for light backgrounds
    }
  } else {
    // Dark background - use light text and lighter surfaces
    const lightness = getLuminance(backgroundColor)
    
    // Generate complementary colors with better contrast
    const surfaceBg = `rgba(255, 255, 255, ${Math.min(0.2, 0.1 + (1 - lightness) * 0.1)})`
    const surfaceBg2 = `rgba(255, 255, 255, ${Math.min(0.15, 0.05 + (1 - lightness) * 0.05)})`
    const border = `rgba(255, 255, 255, ${Math.min(0.3, 0.2 + (1 - lightness) * 0.1)})`
    
    // For dark backgrounds, create a vibrant primary color
    // Make it lighter than background but still visible
    const primary = adjustBrightness(backgroundColor, Math.min(60, 30 + (1 - lightness) * 30))
    const primaryHover = adjustBrightness(backgroundColor, Math.min(80, 50 + (1 - lightness) * 30))
    
    // For dark backgrounds, use darker shadows based on background
    const shadowR = Math.max(0, rgb.r - 30)
    const shadowG = Math.max(0, rgb.g - 30)
    const shadowB = Math.max(0, rgb.b - 30)
    
    return {
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.9)',
      surfaceBg,
      surfaceBg2,
      border,
      primary,
      primaryHover,
      primaryText: '#FFFFFF',
      accent: '#FBBF24', // Keep accent color for visibility
      muted: `rgba(255, 255, 255, ${Math.min(0.7, 0.5 + (1 - lightness) * 0.2)})`,
      shadowColor: `rgba(${shadowR}, ${shadowG}, ${shadowB}, 0.5)`,
      shadowColorLight: `rgba(${shadowR}, ${shadowG}, ${shadowB}, 0.3)`,
      primaryGlow: generateGlowColor(backgroundColor, 0.35), // Glow matches background color
      primaryGlowStrong: generateGlowColor(backgroundColor, 0.45), // Stronger glow for emphasis
      primaryGlowSubtle: generateGlowColor(backgroundColor, 0.25), // Subtle glow for lighter elements
      edgeAccent: generateEdgeAccentColor(backgroundColor, 0.4), // Edge accents match background
      lighterSurface: generateLighterSurface(backgroundColor, 0.9), // Lighter surface for buttons
    }
  }
}

/**
 * Convert any color format to hex
 */
export function normalizeToHex(color: string): string {
  if (color.startsWith('#')) {
    return color
  }

  // Handle rgba/rgb
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10)
    const g = parseInt(rgbaMatch[2], 10)
    const b = parseInt(rgbaMatch[3], 10)
    return rgbToHex(r, g, b)
  }

  return '#000000'
}

