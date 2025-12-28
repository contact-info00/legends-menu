'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Copy, Check, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { HexColorPicker } from 'react-colorful'
import { generateColorScheme, normalizeToHex } from '@/lib/color-utils'

interface ThemeColors {
  appBg: string
  backgroundImageMediaId?: string | null
}

const defaultTheme: ThemeColors = {
  appBg: '#400810',
  backgroundImageMediaId: null,
}

// Helper function to convert rgba/rgb to hex (for color picker)
const rgbaToHex = (color: string): string => {
  if (color.startsWith('#')) {
    return color
  }
  
  // Handle rgba/rgb
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10)
    const g = parseInt(rgbaMatch[2], 10)
    const b = parseInt(rgbaMatch[3], 10)
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')}`
  }
  
  return '#000000'
}

// Get initial theme from CSS variable to prevent flash
function getInitialTheme(): ThemeColors {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return defaultTheme
  }
  
  try {
    const currentBg = getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim()
    if (currentBg && currentBg !== '#400810' && currentBg !== '') {
      return { appBg: currentBg }
    }
  } catch (error) {
    // Fallback to default if there's any error
  }
  
  return defaultTheme
}

export default function ThemePage() {
  const router = useRouter()
  const [theme, setTheme] = useState<ThemeColors>(getInitialTheme())
  const [previewTheme, setPreviewTheme] = useState<ThemeColors>(getInitialTheme())
  const [isLoading, setIsLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors | null>(null)
  const [tempColor, setTempColor] = useState<string>('#000000')
  const [copied, setCopied] = useState<string | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Apply theme immediately before paint to prevent flash
  useLayoutEffect(() => {
    // Apply current theme from CSS variable immediately
    const initialTheme = getInitialTheme()
    applyThemeToDocument(initialTheme)
  }, [])

  useEffect(() => {
    // Fetch the actual theme from API after initial render
    fetchTheme()
  }, [])

  const fetchTheme = async () => {
    try {
      const response = await fetch('/api/admin/theme')
      if (response.ok) {
        const data = await response.json()
        if (data.theme) {
          const themeData = { ...defaultTheme, ...data.theme }
          setTheme(themeData)
          setPreviewTheme(themeData)
          // Apply immediately on load
          applyThemeToDocument(themeData)
        }
      }
    } catch (error) {
      console.error('Error fetching theme:', error)
    }
  }

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    // Only update the preview state, don't apply to document until save
    const newTheme = { ...previewTheme, [key]: value }
    setPreviewTheme(newTheme)
  }

  const applyThemeToDocument = (themeData: ThemeColors) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    
    // Dispatch event to notify ThemeProvider to update
    window.dispatchEvent(new CustomEvent('theme-updated'))
    
    // Apply CSS variable for background color (used for components even if image is set)
    if (document.documentElement) {
      document.documentElement.style.setProperty('--app-bg', themeData.appBg)
      
      // Set background image if available (apply to both html and body)
      if (themeData.backgroundImageMediaId) {
        const imageUrl = `url(/api/media/${themeData.backgroundImageMediaId})`
        document.documentElement.style.setProperty('--app-bg-image', imageUrl)
        document.documentElement.style.setProperty('background-image', imageUrl)
        document.documentElement.style.setProperty('background-size', 'cover')
        document.documentElement.style.setProperty('background-position', 'center')
        document.documentElement.style.setProperty('background-repeat', 'no-repeat')
        document.documentElement.style.setProperty('background-attachment', 'fixed')
        
        // Also apply to body
        if (document.body) {
          document.body.style.backgroundImage = imageUrl
          document.body.style.backgroundSize = 'cover'
          document.body.style.backgroundPosition = 'center'
          document.body.style.backgroundRepeat = 'no-repeat'
          document.body.style.backgroundAttachment = 'fixed'
        }
      } else {
        document.documentElement.style.removeProperty('--app-bg-image')
        document.documentElement.style.removeProperty('background-image')
        document.documentElement.style.removeProperty('background-size')
        document.documentElement.style.removeProperty('background-position')
        document.documentElement.style.removeProperty('background-repeat')
        document.documentElement.style.removeProperty('background-attachment')
        
        // Remove from body
        if (document.body) {
          document.body.style.removeProperty('background-image')
          document.body.style.removeProperty('background-size')
          document.body.style.removeProperty('background-position')
          document.body.style.removeProperty('background-repeat')
          document.body.style.removeProperty('background-attachment')
        }
      }
    }
    
    // Generate and apply complementary color scheme
    const hexColor = normalizeToHex(themeData.appBg)
    const colorScheme = generateColorScheme(hexColor)
    
    // Apply all generated colors as CSS variables with auto- prefix
    if (document.documentElement) {
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
    
    // Apply background color to body/html only if no image is set
    if (!themeData.backgroundImageMediaId && document.body) {
      document.body.style.backgroundColor = themeData.appBg
    }
    
    // Apply to all pages that have hardcoded backgrounds (only if no image)
    if (!themeData.backgroundImageMediaId) {
      const adminPages = document.querySelectorAll('[style*="backgroundColor"]')
      adminPages.forEach((el) => {
        const style = (el as HTMLElement)?.style
        if (style && style.backgroundColor && (
          style.backgroundColor.includes('400810') || 
          style.backgroundColor.includes('rgb(64, 8, 16)') ||
          style.backgroundColor === 'var(--app-bg, #400810)'
        )) {
          style.backgroundColor = themeData.appBg
        }
      })
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewTheme),
      })

      if (response.ok) {
        setTheme(previewTheme)
        applyThemeToDocument(previewTheme)
        // Cache in localStorage for immediate application on next page load
        try {
          localStorage.setItem('theme-appBg', previewTheme.appBg)
        } catch (e) {
          // localStorage might not be available
        }
        toast.success('Background color saved successfully!')
      } else {
        toast.error('Failed to save background color')
      }
    } catch (error) {
      console.error('Error saving theme:', error)
      toast.error('Failed to save background color')
    } finally {
      setIsLoading(false)
    }
  }

  const openColorPicker = (key: keyof ThemeColors) => {
    setSelectedColor(key)
    // Convert rgba to hex for the color picker
    const hexColor = rgbaToHex(previewTheme[key])
    setTempColor(hexColor)
  }

  const closeColorPicker = () => {
    setSelectedColor(null)
  }

  const applyColor = () => {
    if (selectedColor) {
      handleColorChange(selectedColor, tempColor)
      closeColorPicker()
    }
  }

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    toast.success('Color copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const { id } = await uploadResponse.json()
      
      // Update preview theme with new image
      const newTheme = { ...previewTheme, backgroundImageMediaId: id }
      setPreviewTheme(newTheme)
      
      toast.success('Background image uploaded! Click Save to apply.')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    const newTheme = { ...previewTheme, backgroundImageMediaId: null }
    setPreviewTheme(newTheme)
    toast.success('Background image removed! Click Save to apply.')
  }

  const isValidHex = (color: string): boolean => {
    // Check if it's a valid hex color or rgba/rgb
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color) || 
           /^rgba?\(/.test(color) ||
           /^hsla?\(/.test(color)
  }

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        closeColorPicker()
      }
    }

    if (selectedColor) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedColor])


  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div className="max-w-4xl mx-auto">
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border"
          style={{
            backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          }}
        >
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-[#FBBF24]" />
            <h1 
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
            >
              Theme & Colors
            </h1>
          </div>
          <Button 
            onClick={() => router.push('/admin-portal')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Color Input */}
          <div 
            className="lg:col-span-2 backdrop-blur-xl rounded-2xl border p-4 sm:p-6"
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-lg sm:text-xl font-bold"
                style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
              >
                Background Color
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Background Color (Welcome Page, Menu Page, Admin Panel)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={previewTheme.appBg}
                    onChange={(e) => {
                      const value = e.target.value
                      if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl')) {
                        handleColorChange('appBg', value)
                      }
                    }}
                    className="flex-1 text-sm"
                    placeholder="#400810"
                  />
                  <button
                    type="button"
                    onClick={() => openColorPicker('appBg')}
                    className="w-16 h-16 rounded border-2 border-white/20 cursor-pointer hover:border-white/40 transition-colors relative flex-shrink-0"
                    style={{ backgroundColor: normalizeToHex(previewTheme.appBg) }}
                    aria-label="Pick background color"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(previewTheme.appBg)}
                    className="p-2 text-white/70 hover:text-white transition-colors"
                    aria-label="Copy color"
                  >
                    {copied === previewTheme.appBg ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/70">
                  This color will be used for all components (text, boxes, frames). If a background image is uploaded, it will replace the background color.
                </p>
              </div>

              {/* Background Image Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Background Image (Optional)
                </label>
                <div className="space-y-3">
                  {previewTheme.backgroundImageMediaId ? (
                    <div className="relative">
                      <img
                        src={`/api/media/${previewTheme.backgroundImageMediaId}`}
                        alt="Background preview"
                        className="w-full h-32 object-cover rounded-lg border-2 border-white/20"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                      <p className="text-sm text-white/70 mb-3">No background image</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="background-image-upload"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload Background Image'}
                      </Button>
                    </div>
                  )}
                  {!previewTheme.backgroundImageMediaId && (
                    <p className="text-xs text-white/70">
                      Upload an image to use as the background. The background color will still be used for all other components.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 mt-6 border-t border-white/20">
              <Button 
                onClick={handleSave} 
                disabled={isLoading} 
                variant="ghost"
                className="flex-1"
                style={{
                  backgroundColor: 'var(--app-bg, #400810)',
                  color: 'var(--auto-text-primary, #FFFFFF)',
                }}
              >
                {isLoading ? 'Saving...' : 'Save Background Color'}
              </Button>
            </div>
          </div>

          {/* Right: Color Picker */}
          <div className="lg:col-span-1">
            {selectedColor ? (
              <div
                ref={colorPickerRef}
                className="backdrop-blur-xl rounded-2xl border p-4 sm:p-6 sticky top-4"
                style={{
                  backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                  borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                  boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">
                    Pick Background Color
                  </h2>
                  <button
                    onClick={closeColorPicker}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Color Picker - HSV gradient square */}
                  <div className="flex justify-center">
                    <HexColorPicker
                      color={tempColor.startsWith('#') ? tempColor : '#000000'}
                      onChange={(color) => {
                        setTempColor(color)
                        // Update preview in real-time
                        handleColorChange(selectedColor, color)
                      }}
                      style={{ width: '100%', height: '200px' }}
                    />
                  </div>

                  {/* HEX Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      HEX Color
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={tempColor}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.startsWith('#') || isValidHex(value)) {
                            setTempColor(value)
                            handleColorChange(selectedColor, value)
                          }
                        }}
                        className="flex-1"
                        placeholder="#000000"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tempColor)}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                        aria-label="Copy color"
                      >
                        {copied === tempColor ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white">
                      Preview
                    </label>
                    <div
                      className="w-full h-16 rounded border-2 border-white/20"
                      style={{ backgroundColor: tempColor }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={applyColor}
                      className="flex-1 bg-[#800020] hover:bg-[#A00028] text-white"
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={closeColorPicker}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="backdrop-blur-xl rounded-2xl border p-6 text-center"
                style={{
                  backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                  borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                  boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
                }}
              >
                <Palette className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70 text-sm">
                  Click the color swatch to customize
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
