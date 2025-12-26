'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone } from 'lucide-react'
import { Language, languages } from '@/lib/i18n'

export default function WelcomePage() {
  const router = useRouter()
  const [selectedLang, setSelectedLang] = useState<Language>('en')
  const [restaurant, setRestaurant] = useState<any>(null)
  const [backgroundMimeType, setBackgroundMimeType] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false)
  const [posterImage, setPosterImage] = useState<string | null>(null)

  const fetchRestaurantData = () => {
    // Fetch restaurant data (non-blocking)
    // Add cache-busting timestamp to ensure fresh data
    fetch(`/api/restaurant?t=${Date.now()}`, {
      cache: 'no-store',
    })
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
              if (!res.ok) {
                throw new Error(`HEAD request failed: ${res.status}`)
              }
              const contentType = res.headers.get('content-type')
              console.log('Detected content type:', contentType)
              setBackgroundMimeType(contentType)
              
              // If it's a video, start loading it
              if (contentType?.startsWith('video/')) {
                setPosterImage(null)
                // Start loading video immediately
                setShouldLoadVideo(true)
              } else {
                // It's an image, don't try to load as video
                setShouldLoadVideo(false)
              }
            })
            .catch((error) => {
              console.error('Error detecting media type:', error)
              // If HEAD fails, try loading as video anyway (browser will handle it)
              setBackgroundMimeType('video/mp4') // Default assumption
              setShouldLoadVideo(true)
            })
        }
      })
      .catch((error) => {
        console.error('Error fetching restaurant:', error)
      })
  }

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('language') as Language
    if (savedLang && languages.some((l) => l.code === savedLang)) {
      setSelectedLang(savedLang)
    }

    // Show UI immediately - don't block render
    setIsLoaded(true)

    // Fetch restaurant data
    fetchRestaurantData()

    // Refresh restaurant data every 30 seconds to catch updates
    const refreshInterval = setInterval(() => {
      fetchRestaurantData()
    }, 30000)

    return () => clearInterval(refreshInterval)
  }, [])

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
                className="absolute inset-0 bg-gradient-to-b from-[#400810] via-[#5C0015] to-[#800020] background-media-fade"
                style={{ zIndex: 1 }}
              />
              {/* Video - loads when shouldLoadVideo is true */}
              {shouldLoadVideo && (
                <video
                  key={restaurant.welcomeBackgroundMediaId}
                  src={`/api/media/${restaurant.welcomeBackgroundMediaId}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover background-media-fade absolute inset-0"
                  style={{ zIndex: 2, opacity: 0, transition: 'opacity 1s ease-in' }}
                  ref={(video) => {
                    // Set mobile-specific attributes
                    if (video) {
                      video.setAttribute('webkit-playsinline', 'true')
                      video.setAttribute('playsinline', 'true')
                      video.setAttribute('x5-playsinline', 'true')
                      video.setAttribute('x5-video-player-type', 'h5')
                      video.setAttribute('x5-video-player-fullscreen', 'false')
                      
                      // Explicitly play video on mobile devices
                      const playPromise = video.play()
                      if (playPromise !== undefined) {
                        playPromise
                          .then(() => {
                            console.log('Video autoplay started')
                            video.style.opacity = '1'
                          })
                          .catch((error) => {
                            console.log('Autoplay prevented, trying to play:', error)
                            // Try to play after user interaction
                            const tryPlay = () => {
                              video.play()
                                .then(() => {
                                  console.log('Video play started after interaction')
                                  video.style.opacity = '1'
                                })
                                .catch((err) => {
                                  console.error('Video play failed:', err)
                                })
                            }
                            // Try on first user interaction
                            document.addEventListener('touchstart', tryPlay, { once: true })
                            document.addEventListener('click', tryPlay, { once: true })
                          })
                      }
                    }
                  }}
                  onLoadedData={(e) => {
                    // Fade in video once loaded
                    console.log('Video loaded successfully')
                    const target = e.currentTarget
                    const playPromise = target.play()
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          setTimeout(() => {
                            target.style.opacity = '1'
                          }, 100)
                        })
                        .catch(() => {
                          // Autoplay blocked, but video is loaded
                          target.style.opacity = '1'
                        })
                    }
                  }}
                  onCanPlay={(e) => {
                    // Video is ready to play
                    console.log('Video can play')
                    const target = e.currentTarget
                    const playPromise = target.play()
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          target.style.opacity = '1'
                        })
                        .catch(() => {
                          // Autoplay might be blocked, but show video anyway
                          target.style.opacity = '1'
                        })
                    } else {
                      target.style.opacity = '1'
                    }
                  }}
                  onPlaying={(e) => {
                    // Video is actually playing
                    console.log('Video is playing')
                    e.currentTarget.style.opacity = '1'
                  }}
                  onError={(e) => {
                    // If video fails to load, fall back to image
                    console.error('Video failed to load, falling back to image', e)
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
        <div className={`absolute inset-0 bg-gradient-to-b from-[#400810] via-[#5C0015] to-[#800020] background-fade-in ${isLoaded ? 'animate-in' : ''}`} />
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
              className={`w-full p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl hover:bg-white/15 transition-all text-center group border border-white/20 welcome-fade-in ${isLoaded ? 'animate-in' : ''}`}
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
              className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300"
              aria-label="Google Maps"
            >
              <MapPin className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-white font-medium text-xs">Location</span>
            </a>
          )}
          {restaurant?.phoneNumber && (
            <a
              href={`tel:${restaurant.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-1.5 p-1 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all shadow-lg border border-white/20 hover:scale-105 transform duration-300"
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
