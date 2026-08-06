'use client'

import { useRouter } from 'next/navigation'
import { Language, languages } from '@/lib/i18n'
import { preloadMenuForNavigation } from '@/lib/preload-menu-client'
import { useState, useEffect, useRef } from 'react'

const POP_ANIM_MS = 450

interface WelcomeLanguageButtonsProps {
  slug: string
  logoUrl: string | null
  appBg: string
  welcomeBgUrl: string | null
  overlayColor: string
  overlayOpacity: number
  isLoaded: boolean
}

type PopupPhase = 'idle' | 'enter' | 'hold' | 'exit'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function WelcomeLanguageButtons({
  slug,
  logoUrl,
  appBg,
  welcomeBgUrl,
  overlayColor,
  overlayOpacity,
}: WelcomeLanguageButtonsProps) {
  const router = useRouter()
  const [popupPhase, setPopupPhase] = useState<PopupPhase>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const finishTransition = async (menuPath: string) => {
    setLoadProgress(1)
    setPopupPhase('exit')
    await delay(POP_ANIM_MS)
    if (cancelledRef.current) return
    router.push(menuPath)
    setPopupPhase('idle')
    setLoadProgress(0)
  }

  const handleLanguageSelect = async (lang: Language) => {
    if (popupPhase !== 'idle') return

    localStorage.setItem('language', lang)
    const menuPath = `/${slug}/menu?lang=${lang}`
    router.prefetch(menuPath)

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!logoUrl || prefersReducedMotion) {
      try {
        await preloadMenuForNavigation(slug, lang)
      } catch {
        // Navigate even if preload fails
      }
      if (!cancelledRef.current) {
        router.push(menuPath)
      }
      return
    }

    setLoadProgress(0)
    setPopupPhase('enter')
    await delay(POP_ANIM_MS)
    if (cancelledRef.current) return

    setPopupPhase('hold')

    try {
      await preloadMenuForNavigation(slug, lang, setLoadProgress)
    } catch {
      setLoadProgress(1)
    }

    if (cancelledRef.current) return
    await finishTransition(menuPath)
  }

  const isTransitioning = popupPhase !== 'idle'

  return (
    <>
      {isTransitioning && logoUrl && (
        <div className="welcome-logo-popup-overlay" aria-live="polite" aria-busy="true">
          <div
            className="welcome-logo-popup-overlay__bg"
            style={{ backgroundColor: appBg }}
          />
          {welcomeBgUrl && (
            <img
              src={welcomeBgUrl}
              alt=""
              aria-hidden="true"
              className="welcome-logo-popup-overlay__media"
            />
          )}
          <div
            className="welcome-logo-popup-overlay__tint"
            style={{
              backgroundColor: overlayColor || '#000000',
              opacity: overlayOpacity ?? 0.5,
            }}
          />

          <div className={`welcome-logo-popup welcome-logo-popup--${popupPhase}`}>
            <div className="welcome-logo-popup__stack">
              <img
                src={logoUrl}
                alt="Restaurant Logo"
                className="welcome-logo-popup__image"
              />
              {popupPhase !== 'exit' && (
                <div className="welcome-logo-popup__progress-line" aria-hidden="true">
                  <div className="welcome-logo-popup__progress-track" />
                  <div
                    className="welcome-logo-popup__progress-fill"
                    style={{ width: `${loadProgress * 100}%` }}
                  />
                </div>
              )}
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
            className="w-full p-3 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl hover:bg-white/15 transition-all text-center group border border-white/20 disabled:cursor-wait"
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
