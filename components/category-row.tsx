'use client'

import { Language } from '@/lib/i18n'
import { getLocalizedText } from '@/lib/i18n'

interface Category {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
  isActive: boolean
}

interface CategoryRowProps {
  categories: Category[]
  currentLang: Language
  onCategoryClick?: (categoryId: string) => void
}

export function CategoryRow({ categories, currentLang, onCategoryClick }: CategoryRowProps) {
  const activeCategories = categories.filter((c) => c.isActive)

  if (activeCategories.length === 0) return null

  return (
    <div 
      className="sticky top-[125px] z-10 bg-gradient-to-b from-[var(--menu-gradient-start)] via-[var(--menu-gradient-start)] to-[var(--menu-gradient-end)] px-2 sm:px-4 py-4 border-b border-[var(--divider-line)]/30 shadow-lg w-full overflow-x-hidden" 
      style={{ 
        backgroundColor: 'var(--menu-gradient-start)',
        position: 'sticky',
        top: '125px',
        zIndex: 10,
        maxWidth: '100vw'
      }}
    >
      <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide max-w-7xl mx-auto w-full">
        {activeCategories.map((category) => (
          <div
            key={category.id}
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <button
              onClick={() => onCategoryClick?.(category.id)}
              className="w-20 h-20 rounded-lg bg-[var(--category-card-bg)] shadow-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all cursor-pointer"
            >
              {category.imageMediaId ? (
                <img
                  src={`/api/media/${category.imageMediaId}`}
                  alt={getLocalizedText(category, currentLang)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </button>
            <span 
              className="text-[var(--item-name-text)] text-center max-w-[80px] truncate"
              style={{ fontSize: 'var(--menu-category-size)' }}
            >
              {getLocalizedText(category, currentLang)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

