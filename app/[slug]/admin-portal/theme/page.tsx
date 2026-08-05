'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Copy, Check, Palette, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { HexColorPicker } from 'react-colorful'
import { generateColorScheme, normalizeToHex } from '@/lib/color-utils'
import { useAdminBootstrap } from '../admin-context'
import { SettingsSkeleton } from '../components/admin-skeleton'

interface ThemeColors {
  appBg: string
  menuBackgroundR2Url?: string | null
  itemNameTextColor?: string | null
  itemPriceTextColor?: string | null
  itemDescriptionTextColor?: string | null
  bottomNavSectionNameColor?: string | null
  categoryNameColor?: string | null
  headerFooterBgColor?: string | null
  glassTintColor?: string | null
}

const defaultTheme: ThemeColors = {
  appBg: '#400810',
  menuBackgroundR2Url: null,
  itemNameTextColor: null,
  itemPriceTextColor: null,
  itemDescriptionTextColor: null,
  bottomNavSectionNameColor: null,
  categoryNameColor: null,
  headerFooterBgColor: null,
  glassTintColor: null,
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
  const params = useParams()
  const slug = params.slug as string
  const { bootstrap, isLoading: isLoadingBootstrap, refresh: refreshBootstrap } = useAdminBootstrap()
  const [theme, setTheme] = useState<ThemeColors>(getInitialTheme())
  const [previewTheme, setPreviewTheme] = useState<ThemeColors>(getInitialTheme())
  const [isLoading, setIsLoading] = useState(false)
  const [selectedColor, setSelectedColor] = useState<keyof ThemeColors | null>(null)
  const [tempColor, setTempColor] = useState<string>('#000000')
  const [copied, setCopied] = useState<string | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const [menuBgPreview, setMenuBgPreview] = useState<string | null>(null)
  const [uploadingMenuBg, setUploadingMenuBg] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD')
  const hasLoadedFromBootstrap = useRef(false)

  // Apply theme immediately before paint to prevent flash
  useLayoutEffect(() => {
    // Apply current theme from CSS variable immediately
    const initialTheme = getInitialTheme()
    applyThemeToDocument(initialTheme)
  }, [])

  useEffect(() => {
    // Load from bootstrap only once on initial page load (avoid overwriting unsaved edits)
    if (bootstrap?.theme && !hasLoadedFromBootstrap.current) {
      hasLoadedFromBootstrap.current = true
      const themeData = { ...defaultTheme, ...bootstrap.theme }
      setTheme(themeData)
      setPreviewTheme(themeData)
      if (themeData.menuBackgroundR2Url) {
        setMenuBgPreview(themeData.menuBackgroundR2Url)
      }
      applyThemeToDocument(themeData)
    } else if (!isLoadingBootstrap && !hasLoadedFromBootstrap.current) {
      hasLoadedFromBootstrap.current = true
      fetchTheme()
    }
    
    // Use bootstrap settings for restaurant ID
    if (bootstrap?.settings?.id) {
      setRestaurantId(bootstrap.settings.id)
    } else {
      // Fetch restaurant ID for menu background upload
      const fetchRestaurantId = async () => {
        try {
          const response = await fetch('/api/admin/settings')
          if (response.ok) {
            const data = await response.json()
            if (data.id) {
              setRestaurantId(data.id)
            }
          }
        } catch (error) {
          console.error('Error fetching restaurant ID:', error)
        }
      }
      fetchRestaurantId()
    }
    
    // Use bootstrap UI settings for currency
    if (bootstrap?.uiSettings?.currency) {
      const currencyValue = bootstrap.uiSettings.currency
      if (currencyValue === 'IQD' || currencyValue === 'USD') {
        setCurrency(currencyValue)
      }
    } else {
      // Fetch currency from UI settings
      const fetchCurrency = async () => {
        try {
          const response = await fetch('/api/admin/ui-settings', {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            if (data.currency && (data.currency === 'IQD' || data.currency === 'USD')) {
              setCurrency(data.currency)
            }
          }
        } catch (error) {
          console.error('Error fetching currency:', error)
        }
      }
      fetchCurrency()
    }
  }, [bootstrap, isLoadingBootstrap])

  const fetchTheme = async () => {
    try {
      const response = await fetch(`/api/${slug}/admin/theme`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      })
      
      // Fix "body stream already read" error by reading response once
      const raw = await response.text()
      let parsed = null
      try {
        parsed = raw ? JSON.parse(raw) : null
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
      }
      
      if (!response.ok) {
        const errorMsg = parsed?.error || parsed?.message || raw || `HTTP ${response.status}`
        if (response.status === 401 || response.status === 403) {
          // Check if it's a restaurant mismatch error
          if (parsed?.error === 'SESSION_RESTAURANT_MISMATCH') {
            // Session is for different restaurant - clear session and redirect
            try {
              await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
            } catch (logoutError) {
              // Ignore logout errors
            }
            toast.error('You are logged into another restaurant. Please login again.', { duration: 5000 })
            router.push(`/${slug}/admin-portal/login`)
            return
          }
          // Other auth errors - redirect to login
          router.push(`/${slug}/admin-portal/login`)
          return
        }
        console.error('Error fetching theme:', response.status, errorMsg)
        toast.error('Failed to load theme settings')
        return
      }
      
      if (parsed?.ok && parsed?.theme) {
        const themeData = { ...defaultTheme, ...parsed.theme }
        setTheme(themeData)
        setPreviewTheme(themeData)
        if (themeData.menuBackgroundR2Url) {
          setMenuBgPreview(themeData.menuBackgroundR2Url)
        }
        // Apply immediately on load
        applyThemeToDocument(themeData)
      } else {
        console.error('Invalid response format:', parsed)
        toast.error('Failed to load theme settings')
      }
    } catch (error) {
      console.error('Error fetching theme:', error)
      toast.error('Failed to load theme settings')
    }
  }

  const handleColorChange = (key: keyof ThemeColors, value: string | null) => {
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
    
    // Apply CSS variable for background color
    if (document.documentElement) {
      document.documentElement.style.setProperty('--app-bg', themeData.appBg)
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
    
    // Apply background color to body/html
    if (document.body) {
      document.body.style.backgroundColor = themeData.appBg
    }
    
    // Apply to all pages that have hardcoded backgrounds
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

  const handleMenuBackgroundUpload = async (file: File) => {
    // Fetch restaurant ID if not already loaded (lazy fetch for mobile)
    let currentRestaurantId = restaurantId
    if (!currentRestaurantId) {
      try {
        const response = await fetch('/api/admin/settings', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.id) {
            currentRestaurantId = data.id
            setRestaurantId(data.id)
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant ID:', error)
      }
    }
    
    if (!currentRestaurantId) {
      toast.error('Restaurant ID not found. Please refresh the page and try again.')
      return
    }

    setUploadingMenuBg(true)
    try {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        toast.error('Please upload an image (JPEG, PNG, WebP) file')
        setUploadingMenuBg(false)
        return
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB')
        setUploadingMenuBg(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'menuBg')
      formData.append('restaurantId', currentRestaurantId)

      const uploadResponse = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to upload menu background')
      }

      const { key, publicUrl } = await uploadResponse.json()
      const updatedTheme = { ...previewTheme, menuBackgroundR2Url: publicUrl, menuBackgroundR2Key: key }
      setPreviewTheme(updatedTheme)
      setMenuBgPreview(publicUrl)
      
      const saveResponse = await fetch(`/api/${slug}/admin/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedTheme),
      })

      // Fix "body stream already read" error by reading response once
      const raw = await saveResponse.text()
      let parsed = null
      try {
        parsed = raw ? JSON.parse(raw) : null
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
      }
      
      if (!saveResponse.ok) {
        const errorMsg = parsed?.error || parsed?.message || raw || `HTTP ${saveResponse.status}`
        if (saveResponse.status === 401 || saveResponse.status === 403) {
          // Check if it's a restaurant mismatch error
          if (parsed?.error === 'SESSION_RESTAURANT_MISMATCH') {
            // Session is for different restaurant - clear session and redirect
            try {
              await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
            } catch (logoutError) {
              // Ignore logout errors
            }
            toast.error('You are logged into another restaurant. Please login again.', { duration: 5000 })
            router.push(`/${slug}/admin-portal/login`)
            return
          }
          throw new Error(parsed?.message || 'Session expired. Please login again.')
        }
        throw new Error(errorMsg)
      }

      if (parsed?.ok && parsed?.theme) {
        setTheme({ ...defaultTheme, ...parsed.theme })
        toast.success('Menu background uploaded successfully!')
        // Trigger menu page refresh if it's open (using localStorage event and custom event)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('theme-updated', Date.now().toString())
          window.dispatchEvent(new Event('storage'))
          window.dispatchEvent(new Event('theme-updated'))
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('Error uploading menu background:', error)
      toast.error(error.message || 'Failed to upload menu background')
    } finally {
      setUploadingMenuBg(false)
    }
  }

  const handleMenuBackgroundRemove = async () => {
    setMenuBgPreview(null)
    const updatedTheme = { ...previewTheme, menuBackgroundR2Url: null, menuBackgroundR2Key: null }
    setPreviewTheme(updatedTheme)
    await handleSave(updatedTheme)
  }

  const handleMenuBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleMenuBackgroundUpload(file)
    }
  }

  const handleSave = async (themeToSave: ThemeColors = previewTheme) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/${slug}/admin/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(themeToSave),
      })

      // Fix "body stream already read" error by reading response once
      const raw = await response.text()
      let parsed = null
      try {
        parsed = raw ? JSON.parse(raw) : null
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
      }
      
      if (!response.ok) {
        const errorMsg = parsed?.error || parsed?.message || raw || `HTTP ${response.status}`
        if (response.status === 401 || response.status === 403) {
          // Check if it's a restaurant mismatch error
          if (parsed?.error === 'SESSION_RESTAURANT_MISMATCH') {
            // Session is for different restaurant - clear session and redirect
            try {
              await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
            } catch (logoutError) {
              // Ignore logout errors
            }
            toast.error('You are logged into another restaurant. Please login again.', { duration: 5000 })
            router.push(`/${slug}/admin-portal/login`)
            return
          }
          // Other auth errors
          toast.error(parsed?.message || 'Session expired. Please login again.')
          router.push(`/${slug}/admin-portal/login`)
          return
        }

        if (response.status === 405) {
          toast.error('Invalid request method. Please refresh and try again.')
          return
        }

        const errorMessage = parsed?.error || parsed?.message || errorMsg || 'Failed to save theme'
        toast.error(errorMessage)
        return
      }

      if (parsed?.ok && parsed?.theme) {
        setTheme({ ...defaultTheme, ...parsed.theme })
        applyThemeToDocument(themeToSave)
        try {
          localStorage.setItem(`theme-appBg-${slug}`, themeToSave.appBg)
          localStorage.removeItem('theme-appBg')
        } catch (e) {
          // localStorage might not be available
        }
        toast.success('Theme saved successfully!')
        // Refresh bootstrap cache after save
        if (refreshBootstrap) {
          refreshBootstrap()
        }
        // Trigger menu page refresh if it's open (using localStorage event and custom event)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('theme-updated', Date.now().toString())
          window.dispatchEvent(new Event('storage'))
          window.dispatchEvent(new Event('theme-updated'))
        }
      } else {
        console.error('Invalid response format:', parsed)
        toast.error('Failed to save theme')
      }
    } catch (error) {
      console.error('Error saving theme:', error)
      toast.error('Failed to save theme. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const openColorPicker = (key: keyof ThemeColors) => {
    setSelectedColor(key)
    // Convert rgba to hex for the color picker
    // For optional color fields, use fallback; appBg is always a string
    const colorValue = (previewTheme[key] ?? defaultTheme[key] ?? (key === 'appBg' ? '#400810' : (key === 'headerFooterBgColor' || key === 'glassTintColor' ? '#FFFFFF' : '#000000'))) as string | null
    if (colorValue) {
      const hexColor = rgbaToHex(colorValue)
      setTempColor(hexColor)
    } else {
      setTempColor('#FFFFFF')
    }
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
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#F7F9F8' }}>
      <div className="max-w-4xl mx-auto">
        <div 
          className="admin-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '0.75rem',
            padding: '1rem 1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#27C499' }} />
            <h1 
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{ color: '#0F172A' }}
            >
              Theme & Colors
            </h1>
          </div>
          <Button 
            onClick={() => router.push(`/${slug}/admin-portal`)} 
            style={{
              backgroundColor: '#27C499',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontWeight: '500',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
            }}
            className="sm:w-auto"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20B08A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#27C499'}
          >
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Color Input */}
          <div 
            className="admin-card lg:col-span-2 p-4 sm:p-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-lg sm:text-xl font-bold"
                style={{ color: '#0F172A' }}
              >
                Background Color
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                  Background Color (Welcome Page, Menu Page, Admin Panel)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="text"
                    value={previewTheme.appBg}
                    onChange={(e) => {
                      const value = e.target.value
                      if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                        handleColorChange('appBg', value)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow backspace, delete, and all navigation keys
                      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                        return
                      }
                    }}
                    className="flex-1 text-sm"
                    placeholder="#400810"
                    style={{
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => openColorPicker('appBg')}
                    className="w-16 h-16 rounded border-2 cursor-pointer transition-colors relative flex-shrink-0"
                    style={{ 
                      backgroundColor: normalizeToHex(previewTheme.appBg),
                      borderColor: '#D1D5DB',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                    aria-label="Pick background color"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(previewTheme.appBg)}
                    style={{ color: '#475569', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                    aria-label="Copy color"
                  >
                    {copied === previewTheme.appBg ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs" style={{ color: '#94A3B8' }}>
                  This color will be used for all components (text, boxes, frames).
                </p>
              </div>

              {/* Menu Page Background Image */}
              <div className="space-y-2 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                  Menu Page Background Image
                </label>
                <div className="space-y-2">
                  {menuBgPreview && (
                    <div className="relative inline-block">
                      <img
                        src={menuBgPreview}
                        alt="Menu Background Preview"
                        className="h-32 w-auto object-cover rounded-lg border-2"
                        style={{ borderColor: '#D1D5DB' }}
                      />
                      <button
                        type="button"
                        onClick={handleMenuBackgroundRemove}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
                    style={{ 
                      borderColor: '#D1D5DB',
                      backgroundColor: '#F7F9F8',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6F7F2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F7F9F8'}
                  >
                    {!menuBgPreview && (
                      <div className="flex flex-col items-center justify-center pt-3 pb-4">
                        <Upload className="w-6 h-6 mb-2" style={{ color: '#475569' }} />
                        <p className="text-sm" style={{ color: '#475569' }}>Click to upload background</p>
                        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PNG, JPG, WEBP — auto-optimized on upload</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleMenuBackgroundChange}
                      disabled={uploadingMenuBg}
                    />
                  </label>
                  {uploadingMenuBg && (
                    <p className="text-sm" style={{ color: '#475569' }}>Uploading background...</p>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>
                    Background image will appear on menu page only (not welcome page). Leave empty to use default background color.
                  </p>
                </div>
              </div>

              {/* Header Background Color */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>Header</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Header Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.headerFooterBgColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('headerFooterBgColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: current background"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('headerFooterBgColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.headerFooterBgColor ? normalizeToHex(previewTheme.headerFooterBgColor) : 'transparent',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick header background color"
                    />
                  </div>
                  {previewTheme.headerFooterBgColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('headerFooterBgColor', null)
                        // Save immediately to persist NULL
                        const updatedTheme = { ...previewTheme, headerFooterBgColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset / Clear
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Applies to header background only. Footer is always transparent.</p>
                </div>
              </div>

              {/* Surface Background Color */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>Surface Background</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Background Color (Items + Bottom Nav + Categories + Basket)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.glassTintColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('glassTintColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: liquid glass effect"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('glassTintColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.glassTintColor ? normalizeToHex(previewTheme.glassTintColor) : 'transparent',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick surface background color"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      handleColorChange('glassTintColor', null)
                      // Save immediately to persist NULL
                      const updatedTheme = { ...previewTheme, glassTintColor: null }
                      setPreviewTheme(updatedTheme)
                      await handleSave(updatedTheme)
                    }}
                    style={{
                      width: '100%',
                      border: '1px solid #D1D5DB',
                      backgroundColor: 'transparent',
                      color: '#475569',
                      fontSize: '0.75rem',
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F7F9F8'
                      e.currentTarget.style.borderColor = '#27C499'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = '#D1D5DB'
                    }}
                  >
                    Reset to Default (Liquid Glass)
                  </Button>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Applies solid background color to item cards, bottom nav box, category headers, and basket drawer. Reset to restore liquid glass effect.</p>
                </div>
              </div>

              {/* Text Color Options */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>Text Colors</h3>
                
                {/* Item Name Text Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Item Name Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.itemNameTextColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('itemNameTextColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: #FFFFFF"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('itemNameTextColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.itemNameTextColor ? normalizeToHex(previewTheme.itemNameTextColor) : '#FFFFFF',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick item name text color"
                    />
                  </div>
                  {previewTheme.itemNameTextColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('itemNameTextColor', null)
                        const updatedTheme = { ...previewTheme, itemNameTextColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Leave empty to use default (white)</p>
                </div>

                {/* Item Price Text Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Item Price Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.itemPriceTextColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('itemPriceTextColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: #FBBF24"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('itemPriceTextColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.itemPriceTextColor ? normalizeToHex(previewTheme.itemPriceTextColor) : '#FBBF24',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick item price text color"
                    />
                  </div>
                  {previewTheme.itemPriceTextColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('itemPriceTextColor', null)
                        const updatedTheme = { ...previewTheme, itemPriceTextColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Leave empty to use default (gold)</p>
                </div>

                {/* Item Description Text Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Item Description Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.itemDescriptionTextColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('itemDescriptionTextColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: #E2E8F0"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('itemDescriptionTextColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.itemDescriptionTextColor ? normalizeToHex(previewTheme.itemDescriptionTextColor) : '#E2E8F0',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick item description text color"
                    />
                  </div>
                  {previewTheme.itemDescriptionTextColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('itemDescriptionTextColor', null)
                        const updatedTheme = { ...previewTheme, itemDescriptionTextColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Leave empty to use default (light gray)</p>
                </div>

                {/* Category Name Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Category Name Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.categoryNameColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('categoryNameColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: #FFFFFF"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('categoryNameColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.categoryNameColor ? normalizeToHex(previewTheme.categoryNameColor) : '#FFFFFF',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick category name color"
                    />
                  </div>
                  {previewTheme.categoryNameColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('categoryNameColor', null)
                        const updatedTheme = { ...previewTheme, categoryNameColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Applies to category names in menu page and bottom nav</p>
                </div>

                {/* Bottom Nav Section Name Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Bottom Nav Section Name Color
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="text"
                      value={previewTheme.bottomNavSectionNameColor || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.startsWith('rgba') || value.startsWith('rgb') || value.startsWith('hsl') || value === '') {
                          handleColorChange('bottomNavSectionNameColor', value || null)
                        }
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace, delete, and all navigation keys
                        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                          return
                        }
                      }}
                      className="flex-1 text-sm"
                      placeholder="Default: #FFFFFF"
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openColorPicker('bottomNavSectionNameColor')}
                      className="w-12 h-12 rounded border-2 cursor-pointer transition-colors flex-shrink-0"
                      style={{ 
                        backgroundColor: previewTheme.bottomNavSectionNameColor ? normalizeToHex(previewTheme.bottomNavSectionNameColor) : '#FFFFFF',
                        borderColor: '#D1D5DB',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#27C499'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                      aria-label="Pick bottom nav section name color"
                    />
                  </div>
                  {previewTheme.bottomNavSectionNameColor && (
                    <Button
                      type="button"
                      onClick={async () => {
                        handleColorChange('bottomNavSectionNameColor', null)
                        const updatedTheme = { ...previewTheme, bottomNavSectionNameColor: null }
                        setPreviewTheme(updatedTheme)
                        await handleSave(updatedTheme)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        fontSize: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
                    >
                      Reset to Default
                    </Button>
                  )}
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Applies to section labels in bottom navigation</p>
                </div>
              </div>

              {/* Currency Settings */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="text-base font-semibold" style={{ color: '#0F172A' }}>Price Currency</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={async (e) => {
                      const newCurrency = e.target.value as 'IQD' | 'USD'
                      setCurrency(newCurrency)
                      // Save immediately
                      try {
                        const response = await fetch('/api/admin/ui-settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ currency: newCurrency }),
                        })
                        if (response.ok) {
                          toast.success('Currency updated successfully!')
                          // Trigger menu page refresh
                          if (typeof window !== 'undefined') {
                            window.localStorage.setItem('typography-updated', Date.now().toString())
                            window.dispatchEvent(new Event('storage'))
                            window.dispatchEvent(new Event('typography-updated'))
                          }
                        } else {
                          toast.error('Failed to update currency')
                        }
                      } catch (error) {
                        console.error('Error updating currency:', error)
                        toast.error('Failed to update currency')
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                    className="focus:outline-none focus:ring-2 focus:ring-[#27C499] focus:border-transparent"
                  >
                    <option value="IQD">IQD (Iraqi Dinar)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>
                    Select the currency to display for all prices in the menu
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 mt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
              <Button 
                onClick={() => handleSave()} 
                disabled={isLoading} 
                className="flex-1"
                style={{
                  backgroundColor: '#27C499',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#20B08A')}
                onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#27C499')}
              >
                {isLoading ? 'Saving...' : 'Save Theme'}
              </Button>
            </div>
          </div>

          {/* Right: Color Picker */}
          <div className="lg:col-span-1">
            {selectedColor ? (
              <div
                ref={colorPickerRef}
                className="admin-card rounded-2xl p-4 sm:p-6 sticky top-4"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
                    Pick {selectedColor === 'appBg' ? 'Background' : selectedColor === 'itemNameTextColor' ? 'Item Name Text' : selectedColor === 'itemPriceTextColor' ? 'Item Price Text' : selectedColor === 'itemDescriptionTextColor' ? 'Item Description Text' : selectedColor === 'categoryNameColor' ? 'Category Name' : selectedColor === 'bottomNavSectionNameColor' ? 'Bottom Nav Section Name' : selectedColor === 'headerFooterBgColor' ? 'Header Background' : selectedColor === 'glassTintColor' ? 'Surface Background' : 'Color'} Color
                  </h2>
                  <button
                    onClick={closeColorPicker}
                    style={{ color: '#475569', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
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
                    <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
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
                        style={{
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tempColor)}
                        style={{ color: '#475569', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
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
                    <label className="block text-sm font-medium" style={{ color: '#0F172A' }}>
                      Preview
                    </label>
                    <div
                      className="w-full h-16 rounded border-2"
                      style={{ 
                        backgroundColor: tempColor,
                        borderColor: '#D1D5DB',
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={applyColor}
                      style={{
                        flex: 1,
                        backgroundColor: '#27C499',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#20B08A'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#27C499'}
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={closeColorPicker}
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: 'transparent',
                        color: '#475569',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F9F8'
                        e.currentTarget.style.borderColor = '#27C499'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#D1D5DB'
                      }}
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
