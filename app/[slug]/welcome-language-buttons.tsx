'use client'

import { useRouter } from 'next/navigation'
import { Language, languages } from '@/lib/i18n'
import { preloadMenuForNavigation } from '@/lib/preload-menu-client'
import { useState } from 'react'

interface WelcomeLanguageButtonsProps {
  slug: string
  logoUrl: string | null
  appBg: string
  isLoaded: boolean
}

export function WelcomeLanguageButtons({
  slug,
  logoUrl,
  appBg,
}: WelcomeLanguageButtonsProps) {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  const handleLanguageSelect = (lang: Language) => {
    if (isTransitioning) return

    localStorage.setItem('language', lang)
    const menuPath = `/${slug}/menu?lang=${lang}`
    router.prefetch(menuPath)

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const startPreload = () => {
      void preloadMenuForNavigation(slug, lang, setLoadProgress).catch(() => {
        setLoadProgress(1)
      })
    }

    if (logoUrl && !prefersReducedMotion) {
      setLoadProgress(0)
      setIsTransitioning(true)
      startPreload()
    } else {
      startPreload()
    }

    router.push(menuPath)
  }

  return (
    <>
      {isTransitioning && logoUrl && (
        <div
          className="welcome-logo-popup-overlay"
          style={{ backgroundColor: appBg }}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="welcome-logo-popup welcome-logo-popup--enter">
            <div className="welcome-logo-popup__stack">
              <img
                src={logoUrl}
                alt="Restaurant Logo"
                className="welcome-logo-popup__image"
              />
              <div className="welcome-logo-popup__progress-line" aria-hidden="true">
                <div className="welcome-logo-popup__progress-track" />
                <div
                  className="welcome-logo-popup__progress-fill"
                  style={{ width: `${loadProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`w-full max-w-[113px] space-y-2 mb-6 ${isTransitioning ? 'pointer-events-none opacity-60' : ''}`}
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            disabled={isTransitioning}
            onClick={() => handleLanguageSelect(lang.code)}
            className="w-full p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl hover:bg-white/15 transition-all text-center group border border-white/20 welcome-box-glow disabled:cursor-wait"
          >
            <div className="flex items-center justify-center">
              <h3 className="text-base font-semibold text-white group-hover:scale-105 transition-transform duration-300">
                {lang.nativeName}
              </h3>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
