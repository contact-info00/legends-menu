'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { Language, languages } from '@/lib/i18n'

export default function WelcomePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string
  const [selectedLang, setSelectedLang] = useState<Language>('en')
  const [restaurant, setRestaurant] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [backgroundMimeType, setBackgroundMimeType] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)

  useEffect(() => {
    if (!slug) return

    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && languages.some((l) => l.code === savedLang)) {
      setSelectedLang(savedLang)
    }

    // Show UI immediately - don't block render
    setIsLoaded(true)

    // Fetch restaurant data by slug
    fetch(`/api/restaurant/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setRestaurant(data)
        // Check if background is video
        if (data.welcomeBackgroundMediaId) {
          // Try to detect video type via HEAD request
          fetch(`/api/media/${data.welcomeBackgroundMediaId}`, { method: 'HEAD' })
            .then((res) => {
              const contentType = res.headers.get('content-type')
              setBackgroundMimeType(contentType)
              
              // If it's a video, start loading it
              if (contentType?.startsWith('video/')) {
                // Start loading video after a short delay
                setTimeout(() => {
                  setShouldLoadVideo(true)
                }, 300)
              }
            })
            .catch(() => {
              // If HEAD fails, assume it might be a video and try loading
              setBackgroundMimeType('video/mp4') // Default assumption
              setTimeout(() => {
                setShouldLoadVideo(true)
              }, 300)
            })
        }
      })
      .catch((error) => {
        console.error('Error fetching restaurant:', error)
        setNotFound(true)
      })
  }, [slug])

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLang(lang)
    localStorage.setItem('language', lang)
    router.push(`/menu?lang=${lang}`)
  }

  // Restaurant not found page
  if (notFound) {
    return (
      <div className="relative min-h-dvh w-full overflow-x-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg, #400810)' }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-semibold text-white mb-4">Restaurant not found</h1>
          <p className="text-white/80">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const overlayStyle = restaurant
    ? {
        backgroundColor: restaurant.welcomeOverlayColor || '#000000',
        opacity: restaurant.welcomeOverlayOpacity || 0.5,
      }
    : { backgroundColor: '#000000', opacity: 0.5 }

  const tagline = restaurant?.welcomeTextEn || 'WHERE EVERY MOMENT BECOMES LEGENDARY'

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden">
      {/* Background Image/Video */}
      {restaurant?.welcomeBackgroundMediaId ? (
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
                  src={`/api/media/${restaurant.welcomeBackgroundMediaId}`}
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
                  src={`/api/media/${restaurant.welcomeBackgroundMediaId}`}
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
        {restaurant?.logoMediaId && (
          <div className={`absolute top-16 left-0 right-0 px-4 py-4 welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}>
            <div className="flex items-center justify-center max-w-7xl mx-auto">
              <img
                src={`/api/media/${restaurant.logoMediaId}`}
                alt="Restaurant Logo"
                className="h-16 w-auto object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        )}
        
        {/* Restaurant Name */}
        {restaurant && (
          <div 
            className={`w-full max-w-[280px] mb-4 text-center welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              {restaurant.nameEn}
            </h1>
          </div>
        )}
        
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
          {restaurant?.googleMapsUrl && (
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
          {restaurant?.phoneNumber && (
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

