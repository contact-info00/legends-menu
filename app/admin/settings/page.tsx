'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface RestaurantSettings {
  nameKu: string
  nameEn: string
  nameAr: string
  googleMapsUrl: string
  phoneNumber: string
  welcomeOverlayColor: string
  welcomeOverlayOpacity: number
  welcomeTextEn: string
  logoMediaId: string | null
  welcomeBackgroundMediaId: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<RestaurantSettings>({
    nameKu: '',
    nameEn: '',
    nameAr: '',
    googleMapsUrl: '',
    phoneNumber: '',
    welcomeOverlayColor: '#000000',
    welcomeOverlayOpacity: 0.5,
    welcomeTextEn: '',
    logoMediaId: null,
    welcomeBackgroundMediaId: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        if (data.logoMediaId) {
          setLogoPreview(`/api/media/${data.logoMediaId}`)
        }
        if (data.welcomeBackgroundMediaId) {
          setBackgroundPreview(`/api/media/${data.welcomeBackgroundMediaId}`)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const { id: mediaId } = await response.json()
      
      // Update settings with new logo
      const updateResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, logoMediaId: mediaId }),
      })

      if (updateResponse.ok) {
        setSettings({ ...settings, logoMediaId: mediaId })
        toast.success('Logo uploaded successfully!')
      } else {
        throw new Error('Failed to update logo')
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      setLogoFile(null)
    }
  }

  const handleBackgroundUpload = async (file: File) => {
    setUploadingBackground(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload background')
      }

      const { id: mediaId } = await response.json()
      
      // Update settings with new background
      const updateResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, welcomeBackgroundMediaId: mediaId }),
      })

      if (updateResponse.ok) {
        setSettings({ ...settings, welcomeBackgroundMediaId: mediaId })
        toast.success('Background uploaded successfully!')
      } else {
        throw new Error('Failed to update background')
      }
    } catch (error: any) {
      console.error('Error uploading background:', error)
      toast.error(error.message || 'Failed to upload background')
    } finally {
      setUploadingBackground(false)
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
      const reader = new FileReader()
      reader.onloadend = () => {
        setBackgroundPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      handleBackgroundUpload(file)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success('Settings saved successfully!')
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

  return (
    <div className="min-h-screen p-2 sm:p-4" style={{ backgroundColor: '#400810' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6 backdrop-blur-xl bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/20 shadow-lg">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Settings</h1>
          <Button 
            onClick={() => router.push('/admin')} 
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow-lg text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </Button>
        </div>

        <div className="backdrop-blur-xl bg-[#400810]/95 rounded-2xl shadow-lg border border-white/20 p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Restaurant Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Restaurant Logo
                </label>
                <div className="space-y-2">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Restaurant Logo"
                        className="h-24 w-auto object-contain rounded-lg border-2 border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null)
                          setSettings({ ...settings, logoMediaId: null })
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                    {!logoPreview && (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-white/70" />
                        <p className="text-sm text-white/70">Click to upload logo</p>
                        <p className="text-xs text-white/50 mt-1">PNG, JPG, WEBP (max 5MB)</p>
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
                    <p className="text-sm text-white/70">Uploading logo...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
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
                <label className="block text-sm font-medium text-white mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  placeholder="+964 750 123 4567"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Welcome Page Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Welcome Text
                </label>
                <textarea
                  value={settings.welcomeTextEn}
                  onChange={(e) => setSettings({ ...settings, welcomeTextEn: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus-visible:outline-none focus-visible:ring-2"
                  rows={3}
                  placeholder="Enter welcome message..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Welcome Background (Photo/Video)
                </label>
                <div className="space-y-2">
                  {backgroundPreview && (
                    <div className="relative">
                      <img
                        src={backgroundPreview}
                        alt="Welcome Background"
                        className="w-full h-48 object-cover rounded-lg border-2 border-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundPreview(null)
                          setSettings({ ...settings, welcomeBackgroundMediaId: null })
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                    {!backgroundPreview && (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-white/70" />
                        <p className="text-sm text-white/70">Click to upload background</p>
                        <p className="text-xs text-white/50 mt-1">PNG, JPG, WEBP, MP4 (max 20MB)</p>
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
                    <p className="text-sm text-white/70">Uploading background...</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
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
                <label className="block text-sm font-medium text-white mb-2">
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

          <Button onClick={handleSave} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}

