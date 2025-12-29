'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
    
    // Ensure video is properly configured for mobile
    v.muted = true
    v.playsInline = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    
    // Only attempt play if video has loaded metadata
    if (v.readyState >= 1) {
      v.play().catch((err) => {
        console.log('Video play attempt failed:', err)
      })
    } else {
      // Wait for metadata to load
      const onReady = () => {
        v.play().catch((err) => {
          console.log('Video play failed after ready:', err)
        })
        v.removeEventListener('loadedmetadata', onReady)
        v.removeEventListener('canplay', onReady)
      }
      v.addEventListener('loadedmetadata', onReady, { once: true })
      v.addEventListener('canplay', onReady, { once: true })
    }
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

  // Function to fetch restaurant data - using useCallback so it can be called from multiple places
  const fetchRestaurant = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      // Add cache-busting to ensure fresh data
      const res = await fetch(`/data/restaurant?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      // Check if background media ID changed - if so, reset all state
      const mediaIdChanged = restaurant?.welcomeBackgroundMediaId !== data.welcomeBackgroundMediaId
      
      if (mediaIdChanged) {
        // Reset state first
        setShouldLoadVideo(false)
        setPosterImage(null)
        setBackgroundMimeType(null)
      }
      
      // Update restaurant data
      setRestaurant(data)
      
      // Check if background is video
      if (data.welcomeBackgroundMediaId) {
        // First, check if we have mimeType from the restaurant data
        const mimeTypeFromData = data.welcomeBackground?.mimeType
        
        if (mimeTypeFromData) {
          // If it's a video and user doesn't prefer reduced motion, start loading it
          if (mimeTypeFromData.startsWith('video/') && !prefersReducedMotion) {
            setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
            setShouldLoadVideo(true)
            setBackgroundMimeType(mimeTypeFromData)
          } else if (mimeTypeFromData.startsWith('video/')) {
            // User prefers reduced motion, use poster only
            setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
            setBackgroundMimeType('image/jpeg')
            setShouldLoadVideo(false)
          } else {
            // It's an image
            setBackgroundMimeType(mimeTypeFromData)
            setPosterImage(null)
            setShouldLoadVideo(false)
          }
        } else {
          // Fallback: Try to detect media type via HEAD request
          const fetchMediaHead = async (retryCount = 0): Promise<void> => {
            try {
              // Add cache-busting to ensure fresh media type detection
              const res = await fetch(`/assets/${data.welcomeBackgroundMediaId}?t=${Date.now()}`, { 
                method: 'HEAD',
                cache: 'no-store',
              })
              const contentType = res.headers.get('content-type')
              
              if (contentType) {
                // If it's a video and user doesn't prefer reduced motion, start loading it
                if (contentType.startsWith('video/') && !prefersReducedMotion) {
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setShouldLoadVideo(true)
                  setBackgroundMimeType(contentType)
                } else if (contentType.startsWith('video/')) {
                  // User prefers reduced motion, use poster only
                  setPosterImage(`/assets/${data.welcomeBackgroundMediaId}`)
                  setBackgroundMimeType('image/jpeg')
                  setShouldLoadVideo(false)
                  } else {
                    // It's an image
                    setBackgroundMimeType(contentType)
                  setPosterImage(null)
                  setShouldLoadVideo(false)
                }
                } else {
                  // No content type, default to image
                  setBackgroundMimeType('image/jpeg')
                setPosterImage(null)
                setShouldLoadVideo(false)
              }
            } catch (error) {
              console.error('HEAD request failed, defaulting to image:', error)
              if (retryCount < 1) {
                setTimeout(() => fetchMediaHead(retryCount + 1), 500)
                return
              }
              // If HEAD fails, default to image (not video)
              setBackgroundMimeType('image/jpeg')
              setPosterImage(null)
              setShouldLoadVideo(false)
            }
          }
          fetchMediaHead()
        }
      } else {
        // No background media
        setBackgroundMimeType(null)
        setPosterImage(null)
        setShouldLoadVideo(false)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
      if (retryCount < 1) {
        setTimeout(() => fetchRestaurant(retryCount + 1), 500)
      }
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && languages.some((l) => l.code === savedLang)) {
      setSelectedLang(savedLang)
    }

    // Show UI immediately - don't block render
    setIsLoaded(true)

    // Fetch restaurant data on mount
    fetchRestaurant()
  }, [fetchRestaurant])

  // Refetch restaurant data when page becomes visible (after admin changes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, refetch to get latest data
        fetchRestaurant()
      }
    }

    const handleFocus = () => {
      // Window regained focus, refetch to get latest data
      fetchRestaurant()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchRestaurant])

  // Attempt autoplay on mount and when video element is ready
  useEffect(() => {
    if (!shouldLoadVideo || prefersReducedMotion) return
    
    const video = videoRef.current
    if (!video) return
    
    // Try immediately if video is ready
    if (video.readyState >= 1) {
      tryPlay()
    } else {
      // Wait for video to be ready
      const onReady = () => {
        tryPlay()
      }
      video.addEventListener('loadedmetadata', onReady, { once: true })
      video.addEventListener('canplay', onReady, { once: true })
      
      return () => {
        video.removeEventListener('loadedmetadata', onReady)
        video.removeEventListener('canplay', onReady)
      }
    }
  }, [shouldLoadVideo, prefersReducedMotion, restaurant?.welcomeBackgroundMediaId])

  // Gesture unlock fallback - listen for first user interaction anywhere on page
  useEffect(() => {
    if (!shouldLoadVideo || prefersReducedMotion) return
    
    let hasPlayed = false
    
    const onFirstGesture = () => {
      if (hasPlayed) return
      const video = videoRef.current
      if (!video) return
      
      // Ensure video is ready
      if (video.readyState >= 1) {
        video.muted = true
        video.playsInline = true
        video.setAttribute('muted', '')
        video.setAttribute('playsinline', '')
        video.play()
          .then(() => {
            hasPlayed = true
            console.log('Video started on user gesture')
          })
          .catch((err) => {
            console.log('Video play failed on gesture:', err)
          })
      } else {
        // Wait for video to be ready
        const onReady = () => {
          video.muted = true
          video.playsInline = true
          video.setAttribute('muted', '')
          video.setAttribute('playsinline', '')
          video.play()
            .then(() => {
              hasPlayed = true
              console.log('Video started on user gesture (after load)')
            })
            .catch((err) => {
              console.log('Video play failed on gesture:', err)
            })
          video.removeEventListener('loadedmetadata', onReady)
          video.removeEventListener('canplay', onReady)
        }
        video.addEventListener('loadedmetadata', onReady, { once: true })
        video.addEventListener('canplay', onReady, { once: true })
      }
    }
    
    // Use document for better mobile compatibility
    document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true })
    document.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true })
    document.addEventListener('click', onFirstGesture, { once: true })
    document.addEventListener('touchend', onFirstGesture, { once: true, passive: true })
    
    return () => {
      document.removeEventListener('touchstart', onFirstGesture)
      document.removeEventListener('pointerdown', onFirstGesture)
      document.removeEventListener('click', onFirstGesture)
      document.removeEventListener('touchend', onFirstGesture)
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
          {/* Show video ONLY if we confirmed it's a video */}
          {backgroundMimeType?.startsWith('video/') && shouldLoadVideo && !prefersReducedMotion ? (
            <video
              ref={videoRef}
              key={`video-${restaurant.welcomeBackgroundMediaId}-${restaurant.updatedAt || Date.now()}`}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              disablePictureInPicture
              controls={false}
              crossOrigin="anonymous"
              poster={posterImage ? `${posterImage}?t=${Date.now()}` : undefined}
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
              onLoadedMetadata={() => {
                // Video metadata loaded, ensure attributes and try play
                const v = videoRef.current
                if (v) {
                  v.muted = true
                  v.playsInline = true
                  v.setAttribute('muted', '')
                  v.setAttribute('playsinline', '')
                  tryPlay()
                }
              }}
              onCanPlay={() => {
                // Video can play, attempt playback immediately
                tryPlay()
              }}
              onLoadedData={() => {
                // Video data loaded, try play
                tryPlay()
              }}
              onError={(e) => {
                // Log error but don't change the media type - show what was uploaded
                console.error('Video failed to load:', e)
              }}
            >
              <source 
                src={`/assets/${restaurant.welcomeBackgroundMediaId}?t=${Date.now()}`} 
                type="video/mp4" 
              />
            </video>
          ) : backgroundMimeType && !backgroundMimeType.startsWith('video/') ? (
            /* Show image ONLY if we confirmed it's an image */
            <img
              key={`image-${restaurant.welcomeBackgroundMediaId}-${restaurant.updatedAt || Date.now()}`}
              src={`/assets/${restaurant.welcomeBackgroundMediaId}?t=${Date.now()}`}
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
          ) : backgroundMimeType === null ? (
            /* Loading state while detecting media type */
            <div 
              className="absolute inset-0"
              style={{ 
                zIndex: 1,
                backgroundColor: 'var(--app-bg, #400810)',
              }}
            />
          ) : (
            /* Fallback: if prefers reduced motion for video, show poster as image */
            <img
              src={`/assets/${restaurant.welcomeBackgroundMediaId}`}
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
