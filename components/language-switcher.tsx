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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate position whenever dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const calculatePosition = () => {
        if (!buttonRef.current) return
        
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const dropdownHeight = 120
        const spaceBelow = window.innerHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        
        let top: number
        // Position dropdown to the left of the button
        const right = Math.max(8, window.innerWidth - buttonRect.right - 10)
        
        if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
          top = buttonRect.bottom + 8
        } else {
          top = buttonRect.top - dropdownHeight - 8
        }
        
        if (top < 8) top = 8
        
        setDropdownPosition({ top, right })
      }
      
      // Calculate immediately with a small delay to ensure button is rendered
      setTimeout(calculatePosition, 0)
      
      // Recalculate on scroll/resize
      window.addEventListener('scroll', calculatePosition, true)
      window.addEventListener('resize', calculatePosition)
      
      return () => {
        window.removeEventListener('scroll', calculatePosition, true)
        window.removeEventListener('resize', calculatePosition)
      }
    } else {
      // Reset position when closed
      setDropdownPosition({ top: 0, right: 0 })
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    // Delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 50)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(prev => !prev)
  }

  return (
    <>
      <div className="relative w-full h-full">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-sm w-full h-full flex items-center justify-center"
          aria-label="Change language"
          type="button"
        >
          <Globe className="w-6 h-6 text-white" />
        </button>
      </div>
      {isOpen && dropdownPosition.top > 0 && (
        <div
          ref={dropdownRef}
          className="fixed backdrop-blur-xl bg-[#400810]/95 rounded-xl shadow-2xl z-[99999] min-w-[120px] max-w-[calc(100vw-2rem)] border border-white/20 language-dropdown-animation"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            pointerEvents: 'auto',
            visibility: 'visible',
            opacity: 1,
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onLanguageChange(lang.code)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl transition-colors ${
                currentLang === lang.code
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80'
              }`}
              type="button"
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      )}
    </>
  )
}


