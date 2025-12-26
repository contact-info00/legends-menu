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

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside)
      
      // Calculate dropdown position based on button position
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      const dropdownHeight = 120 // Approximate height of dropdown
      
      let top: number
      let right: number
      
      // Position dropdown below button if there's space, otherwise above
      if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
        // Position below button
        top = buttonRect.bottom + window.scrollY + 8
      } else {
        // Position above button
        top = buttonRect.top + window.scrollY - dropdownHeight - 8
      }
      
      // Align right edge with button's right edge
      right = window.innerWidth - buttonRect.right
      
      setDropdownPosition({ top, right })
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
      </div>
      {isOpen && dropdownPosition && (
        <div
          ref={dropdownRef}
          className="fixed backdrop-blur-xl bg-[#400810]/95 rounded-xl shadow-2xl z-[9999] min-w-[120px] max-w-[calc(100vw-2rem)] border border-white/20 language-dropdown-animation"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
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
    </>
  )
}

