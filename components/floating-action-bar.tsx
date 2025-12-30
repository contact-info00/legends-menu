'use client'

import { Search, MessageSquare } from 'lucide-react'
import { LanguageSwitcher } from './language-switcher'
import { Language } from '@/lib/i18n'

interface FloatingActionBarProps {
  currentLang: Language
  onLanguageChange: (lang: Language) => void
  onSearchClick: () => void
  onFeedbackClick: () => void
}

export function FloatingActionBar({
  currentLang,
  onLanguageChange,
  onSearchClick,
  onFeedbackClick,
}: FloatingActionBarProps) {
  return (
    <div className="relative px-2 sm:px-4 py-4 w-full overflow-x-hidden" style={{ zIndex: 10 }}>
      <div className="max-w-7xl mx-auto w-full">
        <div className="relative inline-block w-full max-w-full">
          {/* Buttons - Horizontal layout */}
          <div className="flex gap-1.5 sm:gap-2 items-center relative justify-between w-full" style={{ overflow: 'visible' }}>
              {/* Search icon - larger box, icon on left with text */}
              <button
                onClick={onSearchClick}
                className="p-1.5 rounded-lg transition-all backdrop-blur-sm border h-8 flex items-center justify-start pl-1.5 gap-1.5 sm:gap-2 px-2 sm:px-3 flex-1 min-w-0"
                style={{
                  backgroundColor: 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.05))',
                  borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                  color: 'var(--auto-text-primary, #FFFFFF)',
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
                aria-label="Search"
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--auto-text-primary, #FFFFFF)' }} />
                <span className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}>Search</span>
              </button>
              
              {/* Other icons on the right */}
              <div className="flex gap-1.5 sm:gap-2 items-center flex-shrink-0" style={{ overflow: 'visible' }}>
                <button
                  onClick={onFeedbackClick}
                  className="p-1.5 rounded-lg transition-all backdrop-blur-sm border w-8 h-8 flex items-center justify-center"
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
                  aria-label="Feedback"
                >
                  <MessageSquare className="w-6 h-6" style={{ color: 'var(--auto-text-primary, #FFFFFF)' }} />
                </button>
                <div className="w-8 h-8" style={{ overflow: 'visible' }}>
                  <LanguageSwitcher
                    currentLang={currentLang}
                    onLanguageChange={onLanguageChange}
                  />
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

