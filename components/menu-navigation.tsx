'use client'

import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'

interface Section {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  isActive: boolean
}

interface Category {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
  isActive: boolean
}

interface MenuNavigationProps {
  sections: Section[]
  categories: Category[]
  activeSectionId: string | null
  currentLang: Language
  onSectionChange: (sectionId: string) => void
  onCategoryClick?: (categoryId: string) => void
}

export function MenuNavigation({
  sections,
  categories,
  activeSectionId,
  currentLang,
  onSectionChange,
  onCategoryClick,
}: MenuNavigationProps) {
  const activeSections = sections.filter((s) => s.isActive)
  const activeCategories = categories.filter((c) => c.isActive)

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-30 w-full px-4 py-3 backdrop-blur-xl shadow-sm transition-all duration-300 ease-in-out border-b" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        backgroundColor: 'var(--app-bg, #400810)',
        borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
        width: '100%'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Combined horizontal box with sections and categories */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide items-center py-1">
          {/* Section Tabs */}
          {activeSections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors duration-300 backdrop-blur-sm border`}
              style={{
                backgroundColor: activeSectionId === section.id 
                  ? 'var(--auto-lighter-surface, rgba(255, 255, 255, 0.15))' 
                  : 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                color: activeSectionId === section.id
                  ? 'var(--auto-text-primary, #FFFFFF)'
                  : 'var(--auto-text-primary, #FFFFFF)',
                borderColor: activeSectionId === section.id
                  ? 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                  : 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                boxShadow: activeSectionId === section.id
                  ? `0 0 15px var(--auto-primary-glow-subtle, rgba(128, 0, 32, 0.25)), 0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (activeSectionId !== section.id) {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
                }
              }}
              onMouseLeave={(e) => {
                if (activeSectionId !== section.id) {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
                }
              }}
            >
              {getLocalizedText(section, currentLang)}
            </button>
          ))}

          {/* Divider between sections and categories if both exist */}
          {activeSections.length > 0 && activeCategories.length > 0 && (
            <div 
              className="flex-shrink-0 w-px h-8"
              style={{ backgroundColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))' }}
            ></div>
          )}

          {/* Categories */}
          {activeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.id)}
              className="flex-shrink-0 relative group"
            >
              {/* Triangular background shape with rounded edges */}
              <div 
                className="relative px-5 py-2.5 backdrop-blur-sm rounded-xl border transition-colors duration-300"
                style={{
                  backgroundColor: 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))',
                  borderColor: 'var(--auto-border, rgba(255, 255, 255, 0.2))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg-2, rgba(255, 255, 255, 0.15))'
                  e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.3))'
                  e.currentTarget.style.boxShadow = `0 0 15px var(--auto-primary-glow-subtle, rgba(128, 0, 32, 0.25)), 0 4px 6px -1px var(--auto-shadow-color, rgba(0, 0, 0, 0.3))`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--auto-surface-bg, rgba(255, 255, 255, 0.1))'
                  e.currentTarget.style.borderColor = 'var(--auto-border, rgba(255, 255, 255, 0.2))'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Left triangular accent */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-4 transition-colors duration-300 group-hover:opacity-75"
                  style={{
                    background: `linear-gradient(to right, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    borderRadius: '0.75rem 0 0 0.75rem'
                  }}
                ></div>
                {/* Right triangular accent */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-4 transition-colors duration-300 group-hover:opacity-75"
                  style={{
                    background: `linear-gradient(to left, var(--auto-edge-accent, rgba(64, 8, 16, 0.4)), transparent)`,
                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    borderRadius: '0 0.75rem 0.75rem 0'
                  }}
                ></div>
                <span 
                  className="relative text-sm font-semibold whitespace-nowrap"
                  style={{ color: 'var(--auto-text-primary, #FFFFFF)' }}
                >
                  {getLocalizedText(category, currentLang)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

