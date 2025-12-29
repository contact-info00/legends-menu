'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { Language, languages } from '@/lib/i18n'

interface Restaurant {
  id: string
  slug: string
  nameKu: string
  nameEn: string
  nameAr: string
  logoMediaId: string | null
  welcomeBackgroundMediaId: string | null
  welcomeOverlayColor: string
  welcomeOverlayOpacity: number
  welcomeTextEn: string | null
  googleMapsUrl: string | null
  phoneNumber: string | null
  logo?: {
    id: string
    mimeType: string
    size: number
  } | null
  welcomeBackground?: {
    id: string
    mimeType: string
    size: number
  } | null
}

interface WelcomePageClientProps {
  restaurant: Restaurant
}

export default function WelcomePageClient({ restaurant }: WelcomePageClientProps) {
  const router = useRouter()
  const [selectedLang, setSelectedLang] = useState<Language>('en')
  const [backgroundMimeType, setBackgroundMimeType] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && languages.some((l) => l.code === savedLang)) {
      setSelectedLang(savedLang)
    }

    // Show UI immediately
    setIsLoaded(true)

    // Check if background is video
    if (restaurant.welcomeBackgroundMediaId) {
      // Try to detect video type via HEAD request with retry
      const fetchMediaHead = async (retryCount = 0) => {
        try {
          const res = await fetch(`/assets/${restaurant.welcomeBackgroundMediaId}`, { method: 'HEAD' })
          const contentType = res.headers.get('content-type')
          setBackgroundMimeType(contentType)
          
          // If it's a video, start loading it
          if (contentType?.startsWith('video/')) {
            // Start loading video after a short delay
            setTimeout(() => {
              setShouldLoadVideo(true)
            }, 300)
          }
        } catch (error) {
          if (retryCount < 1) {
            setTimeout(() => fetchMediaHead(retryCount + 1), 500)
            return
          }
          // If HEAD fails, assume it might be a video and try loading
          setBackgroundMimeType('video/mp4') // Default assumption
          setTimeout(() => {
            setShouldLoadVideo(true)
          }, 300)
        }
      }
      fetchMediaHead()
    }
  }, [restaurant.welcomeBackgroundMediaId])

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLang(lang)
    localStorage.setItem('language', lang)
    router.push(`/${restaurant.slug}/menu?lang=${lang}`)
  }

  const overlayStyle = {
    backgroundColor: restaurant.welcomeOverlayColor || '#000000',
    opacity: restaurant.welcomeOverlayOpacity || 0.5,
  }

  const tagline = restaurant.welcomeTextEn || 'WHERE EVERY MOMENT BECOMES LEGENDARY'

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden">
      {/* Background Image/Video */}
      {restaurant.welcomeBackgroundMediaId ? (
        <div className={`absolute inset-0 background-fade-in ${isLoaded ? 'animate-in' : ''}`}>
          {/* Try video first if we detected it's a video, or if backgroundMimeType is null (still detecting) */}
          {(backgroundMimeType === null || backgroundMimeType?.startsWith('video/')) ? (
            <>
              {/* Poster/Placeholder - shows immediately */}
              <div 
                className="absolute inset-0 background-media-fade"
                style={{ 
                  zIndex: 1,
                  backgroundColor: 'var(--app-bg, #400810)',
                }}
              />
              {/* Video - loads lazily */}
              {shouldLoadVideo && (
                <video
                  key={restaurant.welcomeBackgroundMediaId}
                  src={`/assets/${restaurant.welcomeBackgroundMediaId}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover background-media-fade absolute inset-0"
                  style={{ zIndex: 2, opacity: 0, transition: 'opacity 1s ease-in' }}
                  onLoadedData={(e) => {
                    // Fade in video once loaded
                    const target = e.currentTarget
                    setTimeout(() => {
                      target.style.opacity = '1'
                    }, 100)
                  }}
                  onError={(e) => {
                    // If video fails to load, fall back to image
                    console.error('Video failed to load, falling back to image')
                    setBackgroundMimeType('image/jpeg')
                    setShouldLoadVideo(false)
                  }}
                />
              )}
              {/* Fallback image if video detection fails */}
              {backgroundMimeType && !backgroundMimeType.startsWith('video/') && (
                <img
                  src={`/assets/${restaurant.welcomeBackgroundMediaId}`}
                  alt="Welcome Background"
                  className="w-full h-full object-cover background-media-fade absolute inset-0"
                  style={{ zIndex: 2 }}
                  loading="eager"
                  decoding="async"
                />
              )}
            </>
          ) : (
            <img
              src={`/api/media/${restaurant.welcomeBackgroundMediaId}`}
              alt="Welcome Background"
              className="w-full h-full object-cover background-media-fade"
              loading="eager"
              decoding="async"
            />
          )}
        </div>
      ) : (
        <div 
          className={`absolute inset-0 background-fade-in ${isLoaded ? 'animate-in' : ''}`}
          style={{ backgroundColor: 'var(--app-bg, #400810)' }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={overlayStyle}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-screen p-6 pb-24">
        {/* Logo */}
        {restaurant.logoMediaId && (
          <div className={`absolute top-16 left-0 right-0 px-4 py-4 welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}>
            <div className="flex items-center justify-center max-w-7xl mx-auto">
              <img
                src={`/assets/${restaurant.logoMediaId}`}
                alt="Restaurant Logo"
                className="h-16 w-auto object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        )}
        
        {/* Restaurant Name */}
        <div 
          className={`w-full max-w-[280px] mb-4 text-center welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
            {restaurant.nameEn}
          </h1>
        </div>
        
        {/* Welcome Text / Tagline */}
        {tagline && (
          <div 
            className={`w-full max-w-[280px] mb-6 text-center welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}
          >
            <p className="text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed welcome-text-lighting luxury-font text-white">
              {tagline}
            </p>
          </div>
        )}
        
        {/* Language Selection Cards */}
        <div className="w-full max-w-[230px] space-y-2 mb-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl hover:bg-white/15 transition-all text-center group border border-white/20 welcome-fade-in welcome-box-glow ${isLoaded ? 'animate-in' : ''}`}
            >
              <div className="flex items-center justify-center">
                <h3 className="text-base font-semibold text-white group-hover:scale-105 transition-transform duration-300">
                  {lang.nativeName}
                </h3>
              </div>
            </button>
          ))}
        </div>

        {/* Location and Phone Icons - Landscape Layout */}
        <div className={`flex items-center gap-1 w-full max-w-[230px] welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}>
          {restaurant.googleMapsUrl && (
            <a
              href={restaurant.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300 welcome-box-glow"
              aria-label="Google Maps"
            >
              <MapPin className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white font-medium text-xs">Location</span>
            </a>
          )}
          {restaurant.phoneNumber && (
            <a
              href={`tel:${restaurant.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300 welcome-box-glow"
              aria-label="Phone"
            >
              <Phone className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white font-medium text-xs">Call</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

