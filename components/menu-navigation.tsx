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
      className="fixed top-0 left-0 right-0 z-30 w-full px-4 py-3 backdrop-blur-xl bg-[#400810] shadow-sm transition-all duration-300 ease-in-out border-b border-white/10" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        backgroundColor: '#400810',
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
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors duration-300 backdrop-blur-sm border ${
                activeSectionId === section.id
                  ? 'bg-gradient-to-r from-[#800020] to-[#5C0015] text-white shadow-lg border-[#A00028]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border-white/20 hover:border-white/30'
              }`}
            >
              {getLocalizedText(section, currentLang)}
            </button>
          ))}

          {/* Divider between sections and categories if both exist */}
          {activeSections.length > 0 && activeCategories.length > 0 && (
            <div className="flex-shrink-0 w-px h-8 bg-white/20"></div>
          )}

          {/* Categories */}
          {activeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.id)}
              className="flex-shrink-0 relative group"
            >
              {/* Triangular background shape with rounded edges */}
              <div className="relative px-5 py-2.5 bg-gradient-to-r from-[#800020]/30 to-[#5C0015]/30 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-gradient-to-r hover:from-[#800020]/50 hover:to-[#5C0015]/50 hover:border-white/40 transition-colors duration-300 hover:shadow-lg">
                {/* Left triangular accent */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-4 transition-colors duration-300 group-hover:opacity-75"
                  style={{
                    background: 'linear-gradient(to right, rgba(128, 0, 32, 0.4), transparent)',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                    borderRadius: '0.75rem 0 0 0.75rem'
                  }}
                ></div>
                {/* Right triangular accent */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-4 transition-colors duration-300 group-hover:opacity-75"
                  style={{
                    background: 'linear-gradient(to left, rgba(92, 0, 21, 0.4), transparent)',
                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    borderRadius: '0 0.75rem 0.75rem 0'
                  }}
                ></div>
                <span className="relative text-sm text-white font-semibold whitespace-nowrap">
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

