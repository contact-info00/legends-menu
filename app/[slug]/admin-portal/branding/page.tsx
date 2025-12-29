'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface BrandColors {
  menuGradientStart: string
  menuGradientEnd: string
  headerText: string
  headerIcons: string
  activeTab: string
  inactiveTab: string
  categoryCardBg: string
  itemCardBg: string
  itemNameText: string
  itemDescText: string
  priceText: string
  dividerLine: string
  modalBg: string
  modalOverlay: string
  buttonBg: string
  buttonText: string
  feedbackCardBg: string
  feedbackCardText: string
  welcomeOverlayColor: string
  welcomeOverlayOpacity: number
}

const defaultColors: BrandColors = {
  menuGradientStart: '#5C0015',
  menuGradientEnd: '#800020',
  headerText: '#FFFFFF',
  headerIcons: '#FFFFFF',
  activeTab: '#FFFFFF',
  inactiveTab: '#CCCCCC',
  categoryCardBg: '#4A5568',
  itemCardBg: '#4A5568',
  itemNameText: '#FFFFFF',
  itemDescText: '#E2E8F0',
  priceText: '#FBBF24',
  dividerLine: '#718096',
  modalBg: '#2D3748',
  modalOverlay: 'rgba(0,0,0,0.7)',
  buttonBg: '#800020',
  buttonText: '#FFFFFF',
  feedbackCardBg: '#4A5568',
  feedbackCardText: '#FFFFFF',
  welcomeOverlayColor: '#000000',
  welcomeOverlayOpacity: 0.5,
}

export default function BrandingPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [colors, setColors] = useState<BrandColors>(defaultColors)
  const [isLoading, setIsLoading] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  const [tempColor, setTempColor] = useState<string>('#000000')
  const colorPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBrandColors()
  }, [])

  const fetchBrandColors = async () => {
    try {
      const response = await fetch('/api/admin/branding')
      if (response.ok) {
        const data = await response.json()
        if (data.brandColors) {
          setColors({ ...defaultColors, ...data.brandColors })
        }
      }
    } catch (error) {
      console.error('Error fetching brand colors:', error)
    }
  }

  const handleColorChange = (key: keyof BrandColors, value: string | number) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandColors: colors }),
      })

      if (response.ok) {
        toast.success('Brand colors saved successfully!')
        // Update CSS variables
        Object.entries(colors).forEach(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
          document.documentElement.style.setProperty(`--${cssKey}`, String(value))
        })
      } else {
        toast.error('Failed to save brand colors')
      }
    } catch (error) {
      console.error('Error saving brand colors:', error)
      toast.error('Failed to save brand colors')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setColors(defaultColors)
    toast.success('Colors reset to defaults')
  }

  const openColorPicker = (key: string, currentValue: string) => {
    // Extract hex color from rgba if needed
    let hexColor = currentValue
    if (currentValue.startsWith('rgba')) {
      // Convert rgba to hex (simplified - you might want a more robust converter)
      hexColor = '#000000' // fallback
    }
    setTempColor(hexColor)
    setColorPickerOpen(key)
  }

  const closeColorPicker = () => {
    setColorPickerOpen(null)
  }

  const applyColor = (key: string) => {
    handleColorChange(key as keyof BrandColors, tempColor)
    closeColorPicker()
  }

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        closeColorPicker()
      }
    }

    if (colorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [colorPickerOpen])

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
      <div className="max-w-6xl mx-auto">
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl rounded-2xl p-3 sm:p-4 border"
          style={{
            backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Branding & Colors</h1>
          <Button 
            onClick={() => router.push(`/${slug}/admin-portal`)} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <div 
          className="backdrop-blur-xl rounded-2xl border p-6 space-y-6"
          style={{
            backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(colors).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <div className="flex items-center gap-2">
                  {typeof value === 'number' ? (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={value}
                      onChange={(e) => handleColorChange(key as keyof BrandColors, parseFloat(e.target.value))}
                      className="flex-1"
                    />
                  ) : (
                    <>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => handleColorChange(key as keyof BrandColors, e.target.value)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => openColorPicker(key, String(value))}
                        className="w-12 h-12 rounded border-2 border-[var(--divider-line)] cursor-pointer hover:border-white transition-colors relative"
                        style={{ backgroundColor: String(value) }}
                        aria-label={`Pick color for ${key}`}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--divider-line)]">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading ? 'Saving...' : 'Save Colors'}
            </Button>
            <Button onClick={handleReset} variant="outline">
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      {colorPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            ref={colorPickerRef}
            className="backdrop-blur-xl rounded-3xl border p-6 w-full max-w-sm"
            style={{
              backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
              borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
              boxShadow: `0 20px 50px -12px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 8px 16px -4px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Pick Color: {colorPickerOpen.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <button
                onClick={closeColorPicker}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* HTML5 Color Picker */}
              <div className="flex items-center gap-4">
                <label className="block text-sm font-medium text-white">
                  Color:
                </label>
                <input
                  type="color"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="w-20 h-12 rounded cursor-pointer border-2 border-[var(--divider-line)]"
                />
                <Input
                  type="text"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="flex-1"
                  placeholder="#000000"
                />
              </div>

              {/* Color Preview */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--item-name-text)]">Preview:</span>
                <div
                  className="w-full h-16 rounded border-2 border-[var(--divider-line)]"
                  style={{ backgroundColor: tempColor }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => applyColor(colorPickerOpen)}
                  className="flex-1"
                >
                  Apply Color
                </Button>
                <Button
                  onClick={closeColorPicker}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

