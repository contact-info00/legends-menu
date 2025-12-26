'use client'

import { OptimizedImage } from './optimized-image'

interface MenuHeaderProps {
  logoUrl?: string
}

export function MenuHeader({ logoUrl }: MenuHeaderProps) {
  return (
    <header 
      className="relative z-10 px-2 sm:px-4 py-4 backdrop-blur-xl bg-white/10 shadow-sm transition-all duration-300 ease-in-out border-b border-white/10 w-full overflow-x-hidden" 
    >
      <div className="flex items-center justify-center max-w-7xl mx-auto w-full">
        {/* Centered Logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Restaurant Logo"
            className="object-contain"
            style={{ 
              height: 'var(--header-logo-size, 32px)',
              width: 'auto',
              maxWidth: '100%'
            }}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div 
            className="bg-white/20 rounded-lg backdrop-blur-sm"
            style={{ 
              height: 'var(--header-logo-size, 32px)',
              width: 'calc(var(--header-logo-size, 32px) * 2.5)'
            }}
          />
        )}
      </div>
    </header>
  )
}

