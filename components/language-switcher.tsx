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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)
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
        setDropdownPosition(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      
      // Calculate dropdown position (for fixed positioning relative to viewport)
      const calculatePosition = () => {
        if (buttonRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect()
          const dropdownHeight = 120 // Approximate height of dropdown (3 languages)
          const spaceBelow = window.innerHeight - buttonRect.bottom
          const spaceAbove = buttonRect.top
          
          let top: number
          let right: number
          
          // Position dropdown below button if there's space, otherwise above
          if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
            // Position below button (using viewport coordinates for fixed positioning)
            top = buttonRect.bottom + 8
          } else {
            // Position above button
            top = buttonRect.top - dropdownHeight - 8
          }
          
          // Align right edge with button's right edge
          // For fixed positioning, right is distance from right edge of viewport
          right = Math.max(8, window.innerWidth - buttonRect.right)
          
          // Ensure dropdown doesn't go off top of screen
          if (top < 8) {
            top = 8
          }
          
          setDropdownPosition({ top, right })
        } else {
          // Fallback position if button ref is not available
          setDropdownPosition({ top: 100, right: 16 })
        }
      }
      
      // Calculate position immediately
      calculatePosition()
      
      // Also recalculate after a tiny delay to ensure button is fully rendered
      const timeoutId = setTimeout(calculatePosition, 10)
      
      return () => {
        clearTimeout(timeoutId)
      }
    } else {
      setDropdownPosition(null)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <>
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
          className="fixed backdrop-blur-xl bg-[#400810]/95 rounded-xl shadow-2xl z-[9999] min-w-[120px] max-w-[calc(100vw-2rem)] border border-white/20 language-dropdown-animation"
          style={
            dropdownPosition
              ? {
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`,
                }
              : {
                  top: '100px',
                  right: '16px',
                  visibility: 'hidden',
                }
          }
        >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onLanguageChange(lang.code)
                  setIsOpen(false)
                  setDropdownPosition(null)
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
    </>
  )
}


