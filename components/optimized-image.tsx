'use client'

import { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  aspectRatio?: 'square' | 'auto'
  sizes?: string
  style?: React.CSSProperties
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  aspectRatio = 'square',
  sizes,
  style,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (priority) {
      setShouldLoad(true)
      return
    }

    // Lazy load using IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [priority])

  const containerClass = aspectRatio === 'square' ? 'aspect-square' : ''
  const skeletonClass = `bg-gradient-to-br from-[#5C0015]/30 to-[#800020]/30 animate-pulse ${containerClass}`
  
  // For auto aspect ratio, don't constrain container
  const imageContainerClass = aspectRatio === 'auto' ? '' : containerClass

  return (
    <div className={`relative ${imageContainerClass}`} ref={imgRef} style={aspectRatio === 'auto' ? style : undefined}>
      {/* Skeleton loader */}
      {!isLoaded && !hasError && (
        <div className={`absolute inset-0 ${skeletonClass}`}>
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/40 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className={`absolute inset-0 ${skeletonClass} flex items-center justify-center text-white/60 text-sm`}>
          No Image
        </div>
      )}

      {/* Actual image */}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`${aspectRatio === 'auto' ? 'w-auto h-full' : 'w-full h-full'} object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={style}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(false)
          }}
          sizes={sizes}
        />
      )}
    </div>
  )
}

