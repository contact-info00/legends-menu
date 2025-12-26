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

interface SectionTabsProps {
  sections: Section[]
  activeSectionId: string | null
  currentLang: Language
  onSectionChange: (sectionId: string) => void
}

export function SectionTabs({
  sections,
  activeSectionId,
  currentLang,
  onSectionChange,
}: SectionTabsProps) {
  const activeSections = sections.filter((s) => s.isActive)

  return (
    <div 
      className="sticky top-[73px] z-20 bg-gradient-to-b from-[var(--menu-gradient-start)] via-[var(--menu-gradient-start)] to-[var(--menu-gradient-end)] px-4 py-2 border-b border-[var(--divider-line)]/30 shadow-lg" 
      style={{ 
        backgroundColor: 'var(--menu-gradient-start)',
        position: 'sticky',
        top: '73px',
        zIndex: 20
      }}
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-7xl mx-auto">
        {activeSections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeSectionId === section.id
                ? 'bg-white/20 text-[var(--active-tab)] shadow-lg'
                : 'text-[var(--inactive-tab)] hover:bg-white/10'
            }`}
          >
            {getLocalizedText(section, currentLang)}
          </button>
        ))}
      </div>
    </div>
  )
}

