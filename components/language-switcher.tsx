'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Language, languages } from '@/lib/i18n'
import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  currentLang: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
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

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside)
      
      // Calculate position relative to viewport
      const buttonRect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: buttonRect.bottom + 8, // mt-2 = 8px
        right: window.innerWidth - buttonRect.right,
      })
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative w-full h-full" style={{ zIndex: 9999, overflow: 'visible' }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg transition-all backdrop-blur-sm border w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
          borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
          boxShadow: `0 2px 4px -1px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
          e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.3))'
          e.currentTarget.style.boxShadow = `0 4px 6px -1px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))'
          e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.2))'
          e.currentTarget.style.boxShadow = `0 2px 4px -1px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`
        }}
        aria-label="Change language"
      >
        <Globe className="w-6 h-6" style={{ color: 'var(--auto-text-primary, #FFFFFF)' }} />
      </button>
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed backdrop-blur-xl rounded-xl min-w-[120px] max-w-[calc(100vw-2rem)] border language-dropdown-animation"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            backgroundColor: 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
            borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
            boxShadow: `0 10px 25px -5px var(--auto-shadow-color, rgba(0, 0, 0, 0.3)), 0 4px 6px -2px var(--auto-shadow-color-light, rgba(0, 0, 0, 0.1))`,
            zIndex: 99999,
            position: 'fixed',
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm first:rounded-t-xl last:rounded-b-xl transition-colors ${
                currentLang === lang.code
                  ? 'font-semibold'
                  : ''
              }`}
              style={{
                backgroundColor: currentLang === lang.code 
                  ? 'var(--app-bg, #400810)' 
                  : 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
                color: 'var(--auto-text-primary, #FFFFFF)',
              }}
              onMouseEnter={(e) => {
                if (currentLang !== lang.code) {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
                }
              }}
              onMouseLeave={(e) => {
                if (currentLang !== lang.code) {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))'
                }
              }}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}


