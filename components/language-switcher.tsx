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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      
      // Calculate immediately - try sync first, then async as fallback
      calculatePosition()
      
      // Also calculate after a tiny delay to ensure DOM is ready
      const timeoutId = setTimeout(calculatePosition, 10)
      
      // Recalculate on scroll/resize
      window.addEventListener('scroll', calculatePosition, true)
      window.addEventListener('resize', calculatePosition)
      
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('scroll', calculatePosition, true)
        window.removeEventListener('resize', calculatePosition)
      }
    } else if (!isOpen) {
      // Reset position when closed
      setDropdownPosition({ top: 0, right: 0 })
    }
  }, [isOpen])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Don't close if clicking the button or dropdown
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      
      setIsOpen(false)
    }

    // Use click event instead of mousedown, and use capture phase
    // Delay significantly to let button click complete first
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [isOpen])

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
    setIsOpen(prev => !prev)
  }

  return (
    <>
      <div className="relative w-full h-full" style={{ pointerEvents: 'auto', zIndex: 10 }}>
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation()
          }}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 shadow-sm w-full h-full flex items-center justify-center cursor-pointer"
          aria-label="Change language"
          type="button"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <Globe className="w-6 h-6 text-white pointer-events-none" />
        </button>
      </div>
      {isOpen && mounted && typeof window !== 'undefined' && createPortal(
        <div
          ref={(el) => {
            dropdownRef.current = el
            if (el && buttonRef.current) {
              // Recalculate position when element is mounted
              const buttonRect = buttonRef.current.getBoundingClientRect()
              const newPosition = {
                top: buttonRect.bottom + 8,
                right: Math.max(8, window.innerWidth - buttonRect.right - 10)
              }
              if (dropdownPosition.top !== newPosition.top || dropdownPosition.right !== newPosition.right) {
                setDropdownPosition(newPosition)
              }
            }
          }}
          className="fixed backdrop-blur-xl bg-[#400810]/95 rounded-xl shadow-2xl z-[99999] min-w-[120px] max-w-[calc(100vw-2rem)] border border-white/20 language-dropdown-animation"
          style={{
            top: dropdownPosition.top > 0 
              ? `${dropdownPosition.top}px` 
              : (buttonRef.current 
                  ? `${buttonRef.current.getBoundingClientRect().bottom + 8}px` 
                  : '50%'),
            right: dropdownPosition.right > 0 
              ? `${dropdownPosition.right}px` 
              : (buttonRef.current
                  ? `${Math.max(8, window.innerWidth - buttonRef.current.getBoundingClientRect().right - 10)}px`
                  : '8px'),
            pointerEvents: 'auto',
            visibility: 'visible',
            opacity: 1,
            display: 'block',
            position: 'fixed',
            zIndex: 99999,
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
        </div>,
        document.body
      )}
    </>
  )
}


