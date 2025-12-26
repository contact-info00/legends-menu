'use client'

import { useState, useEffect, useRef } from 'react'
import { Language, languages } from '@/lib/i18n'
import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  currentLang: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Check if dropdown would go off-screen and adjust position
      if (dropdownRef.current && buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const dropdownRect = dropdownRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        
        // If not enough space below but enough above, flip to top
        if (spaceBelow < dropdownRect.height && spaceAbove > dropdownRect.height) {
          dropdownRef.current.classList.remove('top-full', 'mt-2')
          dropdownRef.current.classList.add('bottom-full', 'mb-2')
        } else {
          dropdownRef.current.classList.remove('bottom-full', 'mb-2')
          dropdownRef.current.classList.add('top-full', 'mt-2')
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative w-full h-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-sm w-full h-full flex items-center justify-center"
        aria-label="Change language"
      >
        <Globe className="w-6 h-6 text-white" />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 backdrop-blur-xl bg-[#400810]/95 rounded-xl shadow-2xl z-50 min-w-[120px] max-w-[calc(100vw-2rem)] border border-white/20 language-dropdown-animation"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl transition-colors ${
                currentLang === lang.code
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

