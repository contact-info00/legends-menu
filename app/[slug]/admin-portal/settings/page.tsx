'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, X } from 'lucide-react'
import { AdminUploadProgress } from '@/components/admin-upload-progress'
import {
  adminNotifyDismiss,
  adminNotifyError,
  adminNotifyLoading,
  adminNotifySuccess,
} from '@/lib/admin-notifications'
import { uploadAdminMedia } from '@/lib/admin-upload'
import { useAdminBootstrap, useAdminRestaurantId, useAdminReady } from '../admin-context'
import { SettingsSkeleton } from '../components/admin-skeleton'

interface RestaurantSettings {
  id?: string
  nameKu: string
  nameEn: string
  nameAr: string
  slug?: string
  googleMapsUrl: string
  phoneNumber: string
  instagramUrl?: string | null
  snapchatUrl?: string | null
  tiktokUrl?: string | null
  serviceChargePercent?: number | null
  welcomeOverlayColor: string
  welcomeOverlayOpacity: number
  welcomeTextEn: string
  logoMediaId: string | null
  footerLogoMediaId: string | null
  welcomeBackgroundMediaId: string | null
  logoR2Key?: string | null
  logoR2Url?: string | null
  footerLogoR2Key?: string | null
  footerLogoR2Url?: string | null
  welcomeBgR2Key?: string | null
  welcomeBgR2Url?: string | null
  welcomeBgMimeType?: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [settings, setSettings] = useState<RestaurantSettings>({
    nameKu: '',
    nameEn: '',
    nameAr: '',
    googleMapsUrl: '',
    phoneNumber: '',
    instagramUrl: '',
    snapchatUrl: '',
    tiktokUrl: '',
    serviceChargePercent: 0,
    welcomeOverlayColor: '#000000',
    welcomeOverlayOpacity: 0.5,
    welcomeTextEn: '',
    logoMediaId: null,
    footerLogoMediaId: null,
    welcomeBackgroundMediaId: null,
  })
  const [serviceChargeInput, setServiceChargeInput] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null)
  const [backgroundUploadProgress, setBackgroundUploadProgress] = useState<number | null>(null)
  // Helper function to handle restaurant mismatch error
  const handleMismatchError = async (response: Response, errorData: any): Promise<boolean> => {
    if (response.status === 401 || response.status === 403) {
      if (errorData.error === 'SESSION_RESTAURANT_MISMATCH') {
        try {
          await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
        } catch (logoutError) {
          // Ignore logout errors
        }
        adminNotifyError('You are logged into another restaurant. Please login again.')
        router.push(`/${slug}/admin-portal/login`)
        return true // Indicates mismatch was handled
      }
      // Other auth errors
      adminNotifyError(errorData.message || 'Session expired. Please login again.')
      router.push(`/${slug}/admin-portal/login`)
      return true
    }
    return false // Not a mismatch error
  }

  const { bootstrap, isLoading, refresh } = useAdminBootstrap()
  const sessionRestaurantId = useAdminRestaurantId()
  const isAdminReady = useAdminReady()

  const resolveRestaurantId = (): string | null => {
    return settings.id ?? sessionRestaurantId
  }

  const requireRestaurantId = (): string | null => {
    const id = resolveRestaurantId()
    if (!id) {
      adminNotifyError('Restaurant information is still loading. Please wait and try again.')
    }
    return id
  }

  const applySettingsToState = (settingsData: RestaurantSettings) => {
    setSettings((prev) => ({ ...prev, ...settingsData }))
    setServiceChargeInput(settingsData.serviceChargePercent?.toString() || '0')
    if (settingsData.logoR2Url) {
      setLogoPreview(settingsData.logoR2Url)
    } else if (settingsData.logoMediaId) {
      setLogoPreview(`/assets/${settingsData.logoMediaId}`)
    }
    if (settingsData.welcomeBgR2Url) {
      setBackgroundPreview(settingsData.welcomeBgR2Url)
    } else if (settingsData.welcomeBackgroundMediaId) {
      setBackgroundPreview(`/assets/${settingsData.welcomeBackgroundMediaId}`)
    }
  }

  useEffect(() => {
    if (!isAdminReady) {
      return
    }
    if (bootstrap?.settings) {
      applySettingsToState(bootstrap.settings)
      return
    }
    void fetchSettings()
  }, [isAdminReady, bootstrap?.settings])

  const fetchSettings = async () => {
    const startTime = performance.now()
    try {
      const response = await fetch(`/api/admin/settings?slug=${slug}`, {
        credentials: 'include',
      })
      const data = await response.json()
      
      if (response.status === 401 || response.status === 403) {
        // Check if it's a restaurant mismatch error
        if (data.error === 'SESSION_RESTAURANT_MISMATCH') {
          // Session is for different restaurant - clear session and redirect
          try {
            await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
          } catch (logoutError) {
            // Ignore logout errors
          }
          adminNotifyError('You are logged into another restaurant. Please login again.')
          router.push(`/${slug}/admin-portal/login`)
          return
        }
        // Other auth errors - redirect to login
        router.push(`/${slug}/admin-portal/login`)
        return
      }
      
      if (response.ok) {
        applySettingsToState(data)
        const fetchTime = performance.now() - startTime
        if (process.env.NODE_ENV === 'development') {
          console.log(`[PERF] Settings fetch (client): ${fetchTime.toFixed(2)}ms`)
        }
      } else {
        console.error('Error fetching settings:', response.status, response.statusText)
        adminNotifyError('Failed to load settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      adminNotifyError('Failed to load settings')
    }
  }

  const handleLogoUpload = async (file: File) => {
    const restaurantId = requireRestaurantId()
    if (!restaurantId) {
      return
    }

    setUploadingLogo(true)
    setLogoUploadProgress(null)
    const toastId = adminNotifyLoading('Uploading logo...')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'logo')
      formData.append('restaurantId', restaurantId)

      const { key, publicUrl } = await uploadAdminMedia({
        formData,
        onProgress: setLogoUploadProgress,
      })

      // Save R2 key/URL to database
      const updateResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...settings,
          logoR2Key: key,
          logoR2Url: publicUrl,
          slug,
        }),
      })

      const updateData = await updateResponse.json().catch(() => ({}))
      
      // Check for mismatch error
      const handled = await handleMismatchError(updateResponse, updateData)
      if (handled) {
        return
      }

      if (updateResponse.ok) {
        applySettingsToState({ ...settings, logoR2Key: key, logoR2Url: publicUrl })
        if (refresh) refresh()
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('restaurant-updated', Date.now().toString())
          window.dispatchEvent(new Event('restaurant-updated'))
        }
        adminNotifySuccess('✓ Upload complete', toastId)
      } else {
        throw new Error(updateData.message || 'Failed to update logo')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      adminNotifyError(error.message || '✕ Upload failed', toastId)
    } finally {
      setUploadingLogo(false)
      setLogoUploadProgress(null)
      setLogoFile(null)
    }
  }

  const handleBackgroundUpload = async (file: File) => {
    const restaurantId = requireRestaurantId()
    if (!restaurantId) {
      return
    }

    setUploadingBackground(true)
    setBackgroundUploadProgress(null)
    const toastId = adminNotifyLoading('Uploading background...')
    try {
      const isVideo = file.type.startsWith('video/')
      const isImage = file.type.startsWith('image/')
      
      if (!isVideo && !isImage) {
        adminNotifyError('Please upload an image (JPEG, PNG, WebP) or video (MP4) file', toastId)
        setUploadingBackground(false)
        return
      }

      const maxImageSize = 15 * 1024 * 1024
      const maxVideoSize = 10 * 1024 * 1024
      const maxSize = isVideo ? maxVideoSize : maxImageSize
      
      if (file.size > maxSize) {
        adminNotifyError(`File size must be less than ${maxSize / (1024 * 1024)}MB`, toastId)
        setUploadingBackground(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('scope', 'welcomeBg')
      formData.append('restaurantId', restaurantId)

      const uploadResult = await uploadAdminMedia({
        formData,
        onProgress: setBackgroundUploadProgress,
      })
      const { key, publicUrl } = uploadResult
      const contentType = (uploadResult as { contentType?: string }).contentType
      const recommendation = (uploadResult as { recommendation?: string }).recommendation
      const storedMimeType = contentType || file.type

      // Save R2 key/URL and mimeType to database
      const updateResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...settings,
          welcomeBgR2Key: key,
          welcomeBgR2Url: publicUrl,
          welcomeBgMimeType: storedMimeType,
          slug,
        }),
      })

      const updateData = await updateResponse.json().catch(() => ({}))
      
      // Check for mismatch error
      const handled = await handleMismatchError(updateResponse, updateData)
      if (handled) {
        return
      }

      if (updateResponse.ok) {
        applySettingsToState({ ...settings, welcomeBgR2Key: key, welcomeBgR2Url: publicUrl, welcomeBgMimeType: storedMimeType })
        if (refresh) refresh()
        adminNotifySuccess(
          recommendation ? `✓ Background uploaded. ${recommendation}` : '✓ Upload complete',
          toastId
        )
      } else {
        throw new Error(updateData.message || 'Failed to update background')
      }
    } catch (error: any) {
      console.error('Error uploading background:', error)
      adminNotifyError(error.message || '✕ Upload failed', toastId)
    } finally {
      setUploadingBackground(false)
      setBackgroundUploadProgress(null)
      setBackgroundFile(null)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      handleLogoUpload(file)
    }
  }

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundFile(file)
      // Create preview for both images and videos
      const reader = new FileReader()
      reader.onloadend = () => {
        setBackgroundPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      handleBackgroundUpload(file)
    }
  }

  const handleSave = async () => {
    // Show immediate feedback and save in background
    const toastId = adminNotifyLoading('Saving settings...')
    
    // Save in background (non-blocking)
    ;(async () => {
      try {
        // Ensure R2 fields are explicitly set to null if they should be removed
        // Explicitly include serviceChargePercent to ensure it's always sent (even if 0)
        const saveData = {
          ...settings,
          slug,
          serviceChargePercent: settings.serviceChargePercent ?? 0, // Ensure it's always sent, default to 0
          // Explicitly include R2 fields - if they're null in state, send null to clear them
          logoR2Key: settings.logoR2Key ?? null,
          logoR2Url: settings.logoR2Url ?? null,
          welcomeBgR2Key: settings.welcomeBgR2Key ?? null,
          welcomeBgR2Url: settings.welcomeBgR2Url ?? null,
          welcomeBgMimeType: settings.welcomeBgMimeType ?? null,
        }
        
        // Log the save data for debugging
        console.log('[SETTINGS SAVE] Saving data:', {
          restaurantId: settings.id,
          slug,
          serviceChargePercent: saveData.serviceChargePercent,
        })
        
        const response = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(saveData),
        })

        // Fix "body stream already read" error by reading response once
        const raw = await response.text()
        let parsed = null
        try {
          parsed = raw ? JSON.parse(raw) : null
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
        }
        
        // Check for mismatch error
        const handled = await handleMismatchError(response, parsed || {})
        if (handled) {
          adminNotifyDismiss(toastId)
          return
        }

        if (response.ok) {
          adminNotifyDismiss(toastId)
          adminNotifySuccess('✓ Settings saved successfully', toastId)
          if (parsed) {
            applySettingsToState(parsed)
          }
          if (refresh) {
            refresh()
          }
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('restaurant-updated', Date.now().toString())
            window.localStorage.setItem('service-charge-updated', Date.now().toString())
            window.dispatchEvent(new Event('storage'))
            window.dispatchEvent(new Event('restaurant-updated'))
            window.dispatchEvent(new Event('service-charge-updated'))
          }
        } else {
          adminNotifyDismiss(toastId)
          adminNotifyError(parsed?.message || parsed?.error || 'Failed to save settings')
          console.error('Settings save error:', parsed)
        }
      } catch (error) {
        console.error('Error saving settings:', error)
        adminNotifyDismiss(toastId)
        adminNotifyError('✕ Failed to save settings')
      }
    })()
  }

  // Show skeleton while loading bootstrap data
  if (isLoading && !isAdminReady) {
    return <SettingsSkeleton />
  }

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#F7F9F8' }}>
      <div className="max-w-6xl mx-auto">
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: '#0F172A' }}>Settings</h1>
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

        <div 
          className="admin-card space-y-6"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>
              Restaurant Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Restaurant Logo
                </label>
                <div className="space-y-2">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Restaurant Logo"
                        className="h-24 w-auto object-contain rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null)
                          setSettings({ 
                            ...settings, 
                            logoMediaId: null,
                            logoR2Key: null,
                            logoR2Url: null
                          })
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full admin-heading hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    {!logoPreview && (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2" style={{ color: '#475569' }} />
                        <p className="text-sm" style={{ color: '#475569' }}>Click to upload logo</p>
                        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PNG, JPG, WEBP — auto-optimized on upload</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={uploadingLogo}
                    />
                  </label>
                  {uploadingLogo && (
                    <AdminUploadProgress label="Uploading..." progress={logoUploadProgress} />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Google Maps URL
                </label>
                <Input
                  type="url"
                  value={settings.googleMapsUrl}
                  onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  placeholder="+964 750 123 4567"
                />
              </div>
              
              {/* Social Media Links */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#0F172A' }}>Social Media</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                      Instagram URL
                    </label>
                    <Input
                      type="url"
                      value={settings.instagramUrl || ''}
                      onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value || null })}
                      placeholder="https://instagram.com/yourpage"
                    />
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                      Leave empty to hide Instagram icon
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                      Snapchat URL
                    </label>
                    <Input
                      type="url"
                      value={settings.snapchatUrl || ''}
                      onChange={(e) => setSettings({ ...settings, snapchatUrl: e.target.value || null })}
                      placeholder="https://snapchat.com/add/yourusername"
                    />
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                      Leave empty to hide Snapchat icon
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                      TikTok URL
                    </label>
                    <Input
                      type="url"
                      value={settings.tiktokUrl || ''}
                      onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value || null })}
                      placeholder="https://tiktok.com/@yourusername"
                    />
                    <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                      Leave empty to hide TikTok icon
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Service Charge */}
              <div className="pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    Service Charge (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={serviceChargeInput === '' ? '' : serviceChargeInput}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      // Allow user to clear field completely - don't force to 0 immediately
                      setServiceChargeInput(inputValue)
                      
                      // Update settings based on input value
                      if (inputValue === '' || inputValue === '-') {
                        // Field is being cleared - set to 0 for now (will be saved as 0)
                        setSettings({ ...settings, serviceChargePercent: 0 })
                      } else {
                        // Try to parse the value
                        const numValue = parseFloat(inputValue)
                        if (!isNaN(numValue)) {
                          const clamped = Math.max(0, Math.min(100, numValue))
                          setSettings({ ...settings, serviceChargePercent: clamped })
                          // Only update input if value was clamped (to show user the clamped value)
                          if (numValue !== clamped && numValue.toString() !== inputValue) {
                            setServiceChargeInput(clamped.toString())
                          }
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // When field loses focus, ensure it has a valid number (default to 0 if empty)
                      const inputValue = e.target.value.trim()
                      if (inputValue === '' || inputValue === '-' || isNaN(parseFloat(inputValue))) {
                        setServiceChargeInput('0')
                        setSettings({ ...settings, serviceChargePercent: 0 })
                      } else {
                        const numValue = parseFloat(inputValue)
                        const clamped = Math.max(0, Math.min(100, numValue))
                        const finalValue = isNaN(clamped) ? 0 : clamped
                        setServiceChargeInput(finalValue.toString())
                        setSettings({ ...settings, serviceChargePercent: finalValue })
                      }
                    }}
                    placeholder="0"
                  />
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                    Percentage added to basket subtotal (0-100, decimals allowed, e.g., 10 or 2.5)
                  </p>
                </div>
              </div>
              
              {settings.slug && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                    QR Code URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={`https://menuzin.com/${settings.slug}`}
                      readOnly
                      style={{ 
                        backgroundColor: '#F7F9F8',
                        color: '#475569',
                        cursor: 'not-allowed',
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://menuzin.com/${settings.slug}`)
                        adminNotifySuccess('✓ URL copied to clipboard!')
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                    Use this URL for your QR code
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#0F172A' }}>
              Welcome Page Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Welcome Text
                </label>
                <textarea
                  value={settings.welcomeTextEn}
                  onChange={(e) => setSettings({ ...settings, welcomeTextEn: e.target.value })}
                  style={{
                    width: '100%',
                    borderRadius: '0.5rem',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#0F172A',
                  }}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27C499]"
                  rows={3}
                  placeholder="Enter welcome message..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Welcome Background (Photo/Video)
                </label>
                <div className="space-y-2">
                  {backgroundPreview && (
                    <div className="relative">
                      {backgroundPreview.startsWith('data:video/') || settings.welcomeBgMimeType?.startsWith('video/') || (settings.welcomeBackgroundMediaId && !settings.welcomeBgR2Url) ? (
                        <video
                          src={backgroundPreview.startsWith('data:') ? backgroundPreview : backgroundPreview}
                          className="w-full h-48 object-cover rounded-lg border-2"
                          style={{ borderColor: '#D1D5DB' }}
                          controls
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={backgroundPreview}
                          alt="Welcome Background"
                          className="w-full h-48 object-cover rounded-lg border-2"
                          style={{ borderColor: '#D1D5DB' }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundPreview(null)
                          setSettings({ 
                            ...settings, 
                            welcomeBackgroundMediaId: null,
                            welcomeBgR2Key: null,
                            welcomeBgR2Url: null,
                            welcomeBgMimeType: null
                          })
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full admin-heading hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    {!backgroundPreview && (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2" style={{ color: '#475569' }} />
                        <p className="text-sm" style={{ color: '#475569' }}>Click to upload background</p>
                        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>PNG, JPG, WEBP (auto-optimized) or MP4 (max 10MB, 1080p)</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4"
                      className="hidden"
                      onChange={handleBackgroundChange}
                      disabled={uploadingBackground}
                    />
                  </label>
                  {uploadingBackground && (
                    <AdminUploadProgress label="Uploading..." progress={backgroundUploadProgress} />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Overlay Color
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={settings.welcomeOverlayColor}
                    onChange={(e) => setSettings({ ...settings, welcomeOverlayColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={settings.welcomeOverlayColor}
                    onChange={(e) => setSettings({ ...settings, welcomeOverlayColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#0F172A' }}>
                  Overlay Opacity ({settings.welcomeOverlayOpacity})
                </label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.welcomeOverlayOpacity}
                  onChange={(e) => setSettings({ ...settings, welcomeOverlayOpacity: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="w-full" 
            size="lg"
            style={{ 
              backgroundColor: isSaving ? '#94A3B8' : '#27C499',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#20B08A'
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#27C499'
            }}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

