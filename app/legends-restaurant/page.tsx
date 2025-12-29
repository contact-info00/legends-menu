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
  const [isMobile, setIsMobile] = useState(false)
  
  // Helper function to attempt video playback
  const tryPlay = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.playsInline = true
    v.play().catch(() => {})
  }

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      window.removeEventListener('resize', checkMobile)
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

    // Fetch restaurant data (non-blocking) with retry
    const fetchRestaurant = async (retryCount = 0): Promise<void> => {
      try {
        const res = await fetch('/data/restaurant')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setRestaurant(data)
        // Check if background is video
        if (data.welcomeBackgroundMediaId) {
          // First, check if we have mimeType from the restaurant data
          const mimeTypeFromData = data.welcomeBackground?.mimeType
          
          if (mimeTypeFromData) {
            console.log('Background media mimeType from API:', mimeTypeFromData)
            setBackgroundMimeType(mimeTypeFromData)
            
            // If it's a video and user doesn't prefer reduced motion, start loading it
            if (mimeTypeFromData.startsWith('video/') && !prefersReducedMotion) {
              setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
              setShouldLoadVideo(true)
            } else if (mimeTypeFromData.startsWith('video/')) {
              // User prefers reduced motion, use poster only
              setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
              setBackgroundMimeType('image/jpeg')
            } else {
              // It's an image
              setPosterImage(null)
            }
          } else {
            // Fallback: Try to detect video type via HEAD request
            const fetchMediaHead = async (retryCount = 0): Promise<void> => {
              try {
                const res = await fetch(`/assets/${data.welcomeBackgroundMediaId}`, { method: 'HEAD' })
                const contentType = res.headers.get('content-type')
                console.log('Background media content type from HEAD:', contentType)
                setBackgroundMimeType(contentType)
                
                // If it's a video and user doesn't prefer reduced motion, start loading it
                if (contentType?.startsWith('video/') && !prefersReducedMotion) {
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setShouldLoadVideo(true)
                } else if (contentType?.startsWith('video/')) {
                  // User prefers reduced motion, use poster only
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setBackgroundMimeType('image/jpeg')
                } else {
                  // It's an image
                  setPosterImage(null)
                }
              } catch (error) {
                console.error('HEAD request failed, defaulting to video attempt:', error)
                if (retryCount < 1) {
                  setTimeout(() => fetchMediaHead(retryCount + 1), 500)
                  return
                }
                // If HEAD fails, try as video and let browser handle it
                if (!prefersReducedMotion) {
                  setBackgroundMimeType('video/mp4')
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setShouldLoadVideo(true)
                } else {
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setBackgroundMimeType('image/jpeg')
                }
              }
            }
            fetchMediaHead()
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant:', error)
        if (retryCount < 1) {
          setTimeout(() => fetchRestaurant(retryCount + 1), 500)
        }
      }
    }
    fetchRestaurant()
  }, [prefersReducedMotion])

  // Attempt autoplay on mount
  useEffect(() => {
    if (shouldLoadVideo && !prefersReducedMotion) {
      tryPlay()
    }
  }, [shouldLoadVideo, prefersReducedMotion])

  // Gesture unlock fallback - listen for first user interaction
  useEffect(() => {
    if (!shouldLoadVideo || prefersReducedMotion) return
    
    const onFirstGesture = () => {
      tryPlay()
    }
    
    window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true })
    window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true })
    window.addEventListener('click', onFirstGesture, { once: true })
    
    return () => {
      window.removeEventListener('touchstart', onFirstGesture)
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('click', onFirstGesture)
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
        <div 
          className={`absolute inset-0 background-fade-in ${isLoaded ? 'animate-in' : ''}`}
        >
          {/* Try video first if we detected it's a video, or if backgroundMimeType is null (still detecting) */}
          {(backgroundMimeType === null || backgroundMimeType?.startsWith('video/')) ? (
            <>
              {/* Poster/Placeholder - shows immediately, hidden when video is playing */}
              {posterImage && shouldLoadVideo && !prefersReducedMotion && (
                <img
                  src={posterImage}
                  alt="Welcome Background Poster"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ 
                    zIndex: 3,
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.5s ease-out',
                    pointerEvents: 'none'
                  }}
                  loading="eager"
                  decoding="async"
                />
              )}
              {!posterImage && (
                <div 
                  className="absolute inset-0"
                  style={{ 
                    zIndex: 1,
                    backgroundColor: 'var(--app-bg, #400810)',
                  }}
                />
              )}
              {/* Video - loads when shouldLoadVideo is true */}
              {shouldLoadVideo && !prefersReducedMotion && (
                <video
                  ref={videoRef}
                  key={restaurant.welcomeBackgroundMediaId}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  disablePictureInPicture
                  controls={false}
                  poster={posterImage || undefined}
                  src={`/assets/${restaurant.welcomeBackgroundMediaId}`}
                  className="w-full h-full object-cover absolute inset-0"
                  style={{ 
                    zIndex: 2, 
                    opacity: 1, 
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onCanPlay={() => {
                    tryPlay()
                  }}
                  onPlaying={(e) => {
                    // Hide poster when video starts playing
                    const poster = document.querySelector('img[alt="Welcome Background Poster"]') as HTMLImageElement
                    if (poster) {
                      poster.style.opacity = '0'
                      poster.style.zIndex = '1'
                    }
                  }}
                  onError={(e) => {
                    // If video fails to load, fall back to image
                    console.error('Video failed to load, falling back to image', e)
                    setBackgroundMimeType('image/jpeg')
                    setShouldLoadVideo(false)
                  }}
                >
                  <source 
                    src={`/assets/${restaurant.welcomeBackgroundMediaId}`} 
                    type="video/mp4" 
                  />
                </video>
              )}
              {/* Fallback image if video detection fails or prefers reduced motion */}
              {(prefersReducedMotion || (backgroundMimeType && !backgroundMimeType.startsWith('video/') && !shouldLoadVideo)) && (
                <img
                  src={posterImage || `/assets/${restaurant.welcomeBackgroundMediaId}`}
                  alt="Welcome Background"
                  className="w-full h-full object-cover absolute inset-0"
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
              src={`/assets/${restaurant.welcomeBackgroundMediaId}`}
              alt="Welcome Background"
              className="w-full h-full object-cover"
              style={{
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
                src={`/assets/${restaurant.logoMediaId}`}
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
