'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { Language, languages } from '@/lib/i18n'

export default function WelcomePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [selectedLang, setSelectedLang] = useState<Language>('en')
  const [restaurant, setRestaurant] = useState<any>(null)
  const [backgroundMimeType, setBackgroundMimeType] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const [posterImage, setPosterImage] = useState<string | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && languages.some((l) => l.code === savedLang)) {
      setSelectedLang(savedLang)
    }

    // Show UI immediately - don't block render
    setIsLoaded(true)

    // Fetch restaurant data (non-blocking)
    fetch('/api/restaurant')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data) => {
        setRestaurant(data)
        // Check if background is video
        if (data.welcomeBackgroundMediaId) {
          // Try to detect video type via HEAD request
          fetch(`/api/media/${data.welcomeBackgroundMediaId}`, { method: 'HEAD' })
            .then((res) => {
              const contentType = res.headers.get('content-type')
              setBackgroundMimeType(contentType)
              
              // If it's a video and user doesn't prefer reduced motion, start loading it
              if (contentType?.startsWith('video/') && !prefersReducedMotion) {
                // Use the same media URL as poster (first frame)
                setPosterImage(`/api/media/${data.welcomeBackgroundMediaId}`)
                // Start loading video after a short delay
                setTimeout(() => {
                  setShouldLoadVideo(true)
                }, 300)
              } else if (contentType?.startsWith('video/')) {
                // User prefers reduced motion, use poster only
                setPosterImage(`/api/media/${data.welcomeBackgroundMediaId}`)
                setBackgroundMimeType('image/jpeg')
              }
            })
            .catch(() => {
              // If HEAD fails, try to load anyway and detect from file extension or let browser handle it
              // Assume it might be a video and try loading
              if (!prefersReducedMotion) {
                setBackgroundMimeType('video/mp4') // Default assumption
                setPosterImage(`/api/media/${data.welcomeBackgroundMediaId}`)
                setTimeout(() => {
                  setShouldLoadVideo(true)
                }, 300)
              } else {
                setPosterImage(`/api/media/${data.welcomeBackgroundMediaId}`)
                setBackgroundMimeType('image/jpeg')
              }
            })
        }
      })
      .catch((error) => {
        console.error('Error fetching restaurant:', error)
      })
  }, [prefersReducedMotion])

  // Force video play on mount for mobile compatibility
  useEffect(() => {
    if (shouldLoadVideo && videoRef.current && !prefersReducedMotion) {
      const video = videoRef.current
      
      // Try to play the video
      const attemptPlay = async () => {
        try {
          await video.play()
        } catch (error) {
          // If autoplay fails, keep the poster visible
          console.log('Video autoplay prevented, showing poster')
          setBackgroundMimeType('image/jpeg')
          setShouldLoadVideo(false)
        }
      }
      
      // Wait for video to be ready
      if (video.readyState >= 2) {
        attemptPlay()
      } else {
        video.addEventListener('loadeddata', attemptPlay, { once: true })
      }
      
      return () => {
        video.removeEventListener('loadeddata', attemptPlay)
      }
    }
  }, [shouldLoadVideo, prefersReducedMotion])

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLang(lang)
    localStorage.setItem('language', lang)
    router.push(`/menu?lang=${lang}`)
  }

  const overlayStyle = restaurant
    ? {
        backgroundColor: restaurant.welcomeOverlayColor || '#000000',
        opacity: restaurant.welcomeOverlayOpacity || 0.5,
      }
    : { backgroundColor: '#000000', opacity: 0.5 }

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
              {shouldLoadVideo && !prefersReducedMotion && (
                <video
                  ref={videoRef}
                  key={restaurant.welcomeBackgroundMediaId}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  controls={false}
                  aria-hidden="true"
                  poster={posterImage || undefined}
                  className="w-full h-full object-cover background-media-fade absolute inset-0"
                  style={{ 
                    zIndex: 2, 
                    opacity: 0, 
                    transition: 'opacity 1s ease-in',
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
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
                >
                  <source 
                    src={`/api/media/${restaurant.welcomeBackgroundMediaId}`} 
                    type="video/mp4" 
                  />
                </video>
              )}
              {/* Fallback image if video detection fails or prefers reduced motion */}
              {(prefersReducedMotion || (backgroundMimeType && !backgroundMimeType.startsWith('video/'))) && (
                <img
                  src={posterImage || `/api/media/${restaurant.welcomeBackgroundMediaId}`}
                  alt="Welcome Background"
                  className="w-full h-full object-cover background-media-fade absolute inset-0"
                  style={{ 
                    zIndex: 2,
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
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
        
        {/* Welcome Text */}
        {restaurant && restaurant.welcomeTextEn && (
          <div 
            className={`w-full max-w-[280px] mb-6 text-center welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}
          >
            <p className="text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed welcome-text-lighting luxury-font">
              {restaurant.welcomeTextEn}
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
