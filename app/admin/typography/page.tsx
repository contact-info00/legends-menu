'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface UiSettings {
  sectionTitleSize: number
  categoryTitleSize: number
  itemNameSize: number
  itemDescriptionSize: number
  itemPriceSize: number
  headerLogoSize: number
  bottomNavSectionSize: number
  bottomNavCategorySize: number
}

export default function TypographyPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UiSettings>({
    sectionTitleSize: 22,
    categoryTitleSize: 18,
    itemNameSize: 16,
    itemDescriptionSize: 14,
    itemPriceSize: 16,
    headerLogoSize: 32,
    bottomNavSectionSize: 18,
    bottomNavCategorySize: 15,
  })
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/ui-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        // Initialize input values
        setInputValues({
          sectionTitleSize: String(data.sectionTitleSize),
          categoryTitleSize: String(data.categoryTitleSize),
          itemNameSize: String(data.itemNameSize),
          itemDescriptionSize: String(data.itemDescriptionSize),
          itemPriceSize: String(data.itemPriceSize),
          headerLogoSize: String(data.headerLogoSize || 32),
          bottomNavSectionSize: String(data.bottomNavSectionSize || 18),
          bottomNavCategorySize: String(data.bottomNavCategorySize || 15),
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/ui-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success('Typography settings saved successfully!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to save settings')
        console.error('Settings save error:', errorData)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const updateInputValue = (key: keyof UiSettings, value: string) => {
    // Allow empty string and any input while typing
    setInputValues((prev) => ({ ...prev, [key]: value }))
    
    // Only update the actual setting if it's a valid number
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && value !== '' && value !== '-') {
      // Different validation for logo size
      if (key === 'headerLogoSize') {
        const clampedValue = Math.max(16, Math.min(80, Math.round(numValue)))
        setSettings((prev) => ({ ...prev, [key]: clampedValue }))
      } else {
        const clampedValue = Math.max(10, Math.min(40, Math.round(numValue)))
        setSettings((prev) => ({ ...prev, [key]: clampedValue }))
      }
    }
  }

  const handleBlur = (key: keyof UiSettings) => {
    const inputValue = inputValues[key] || String(settings[key])
    const numValue = parseInt(inputValue, 10)
    
    if (key === 'headerLogoSize') {
      if (isNaN(numValue) || numValue < 16) {
        const finalValue = 16
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      } else if (numValue > 80) {
        const finalValue = 80
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      } else {
        const finalValue = Math.round(numValue)
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      }
    } else {
      if (isNaN(numValue) || numValue < 10) {
        const finalValue = 10
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      } else if (numValue > 40) {
        const finalValue = 40
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      } else {
        const finalValue = Math.round(numValue)
        setSettings((prev) => ({ ...prev, [key]: finalValue }))
        setInputValues((prev) => ({ ...prev, [key]: String(finalValue) }))
      }
    }
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/20 shadow-lg">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Typography Settings</h1>
          <Button 
            onClick={() => router.push('/admin')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl shadow-lg border border-white/20 p-4 sm:p-6 space-y-6">
          {/* Font Size Controls */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Font Sizes (px)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Section Title Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.sectionTitleSize ?? settings.sectionTitleSize}
                  onChange={(e) => updateInputValue('sectionTitleSize', e.target.value)}
                  onBlur={() => handleBlur('sectionTitleSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category Title Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.categoryTitleSize ?? settings.categoryTitleSize}
                  onChange={(e) => updateInputValue('categoryTitleSize', e.target.value)}
                  onBlur={() => handleBlur('categoryTitleSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Item Name Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.itemNameSize ?? settings.itemNameSize}
                  onChange={(e) => updateInputValue('itemNameSize', e.target.value)}
                  onBlur={() => handleBlur('itemNameSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Item Description Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.itemDescriptionSize ?? settings.itemDescriptionSize}
                  onChange={(e) => updateInputValue('itemDescriptionSize', e.target.value)}
                  onBlur={() => handleBlur('itemDescriptionSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Item Price Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.itemPriceSize ?? settings.itemPriceSize}
                  onChange={(e) => updateInputValue('itemPriceSize', e.target.value)}
                  onBlur={() => handleBlur('itemPriceSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Header Logo Size (px)
                </label>
                <Input
                  type="number"
                  min="16"
                  max="80"
                  value={inputValues.headerLogoSize ?? settings.headerLogoSize}
                  onChange={(e) => updateInputValue('headerLogoSize', e.target.value)}
                  onBlur={() => handleBlur('headerLogoSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Bottom Navigation Section Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.bottomNavSectionSize ?? settings.bottomNavSectionSize}
                  onChange={(e) => updateInputValue('bottomNavSectionSize', e.target.value)}
                  onBlur={() => handleBlur('bottomNavSectionSize')}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Bottom Navigation Category Size (px)
                </label>
                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={inputValues.bottomNavCategorySize ?? settings.bottomNavCategorySize}
                  onChange={(e) => updateInputValue('bottomNavCategorySize', e.target.value)}
                  onBlur={() => handleBlur('bottomNavCategorySize')}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Preview</h2>
            <div 
              className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 space-y-4"
              style={{
                ['--menu-section-size' as any]: `${settings.sectionTitleSize}px`,
                ['--menu-category-size' as any]: `${settings.categoryTitleSize}px`,
                ['--menu-item-name-size' as any]: `${settings.itemNameSize}px`,
                ['--menu-item-desc-size' as any]: `${settings.itemDescriptionSize}px`,
                ['--menu-item-price-size' as any]: `${settings.itemPriceSize}px`,
                ['--header-logo-size' as any]: `${settings.headerLogoSize}px`,
                ['--bottom-nav-section-size' as any]: `${settings.bottomNavSectionSize}px`,
                ['--bottom-nav-category-size' as any]: `${settings.bottomNavCategorySize}px`,
              }}
            >
              {/* Section Preview */}
              <div>
                <div 
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#5C0015] text-white font-medium mb-3 inline-block"
                  style={{ fontSize: 'var(--menu-section-size)' }}
                >
                  Sample Section
                </div>
              </div>

              {/* Category Preview */}
              <div>
                <div 
                  className="relative inline-block px-6 py-3 bg-gradient-to-r from-[#800020]/30 to-[#5C0015]/30 backdrop-blur-sm rounded-xl border border-white/20 mb-4"
                >
                  <h2 
                    className="font-bold text-white"
                    style={{ fontSize: 'var(--menu-category-size)' }}
                  >
                    Sample Category
                  </h2>
                </div>
              </div>

              {/* Item Card Preview */}
              <div className="rounded-2xl overflow-hidden shadow-xl border border-white/30 bg-white/10 backdrop-blur-xl p-4">
                <div className="aspect-square w-full bg-gradient-to-br from-[#5C0015]/30 to-[#800020]/30 rounded-xl mb-3 flex items-center justify-center text-white/60">
                  Item Image
                </div>
                <div className="space-y-2">
                  <h3 
                    className="font-semibold text-white"
                    style={{ fontSize: 'var(--menu-item-name-size)' }}
                  >
                    Sample Item Name
                  </h3>
                  <p 
                    className="text-white/80"
                    style={{ fontSize: 'var(--menu-item-desc-size)' }}
                  >
                    Sample item description text
                  </p>
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[#FBBF24] font-bold"
                      style={{ fontSize: 'var(--menu-item-price-size)' }}
                    >
                      15,000 IQD
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Logo Preview */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2">Header Logo Preview</h3>
                <div className="backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-center">
                    <div 
                      className="bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center text-white/60"
                      style={{ 
                        height: `${settings.headerLogoSize}px`,
                        width: `${settings.headerLogoSize * 2.5}px`,
                        fontSize: `${settings.headerLogoSize * 0.4}px`
                      }}
                    >
                      Logo
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation Preview */}
              <div>
                <h3 className="text-sm font-medium text-white/80 mb-2">Bottom Navigation Preview</h3>
                <div className="backdrop-blur-xl bg-gradient-to-r from-[#800020]/30 to-[#5C0015]/30 rounded-xl p-4 border border-white/20">
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center justify-center">
                      <div 
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#5C0015] text-white font-medium"
                        style={{ fontSize: 'var(--bottom-nav-section-size)' }}
                      >
                        Section
                      </div>
                    </div>
                    <div className="flex gap-2 items-center justify-center">
                      <div 
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#800020]/40 to-[#5C0015]/40 text-white font-semibold"
                        style={{ fontSize: 'var(--bottom-nav-category-size)' }}
                      >
                        Category
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? 'Saving...' : 'Save Typography Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

