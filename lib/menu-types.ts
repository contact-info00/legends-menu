import type { Language } from '@/lib/i18n'

export interface MenuItem {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  descriptionKu?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  price: number
  imageMediaId: string | null
  imageR2Key?: string | null
  imageR2Url?: string | null
  sortOrder: number
  isActive: boolean
  categoryId?: string
}

export interface MenuCategory {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  imageMediaId: string | null
  imageR2Key?: string | null
  imageR2Url?: string | null
  sortOrder: number
  isActive: boolean
  items: MenuItem[]
}

export interface MenuSection {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  sortOrder: number
  isActive: boolean
  categories: MenuCategory[]
}

export interface MenuUiSettings {
  sectionTitleSize: number
  categoryTitleSize: number
  itemNameSize: number
  itemDescriptionSize: number
  itemPriceSize: number
  headerLogoSize: number
  bottomNavSectionSize: number
  bottomNavCategorySize: number
  currency: 'IQD' | 'USD'
}

export interface MenuTheme {
  menuBackgroundR2Url?: string | null
  itemNameTextColor?: string | null
  itemPriceTextColor?: string | null
  itemDescriptionTextColor?: string | null
  bottomNavSectionNameColor?: string | null
  categoryNameColor?: string | null
  headerFooterBgColor?: string | null
  glassTintColor?: string | null
  appBg?: string | null
}

export interface MenuRestaurant {
  id: string
  nameKu: string
  nameEn: string
  nameAr: string
  logoR2Url?: string | null
  logoMediaId?: string | null
  serviceChargePercent: number
}

export interface MenuPageInitialData {
  restaurant: MenuRestaurant
  theme: MenuTheme | null
  sections: MenuSection[]
  uiSettings: MenuUiSettings
  footerLogoUrl: string | null
  initialSectionId: string | null
  initialCategoryId: string | null
  initialCategoryItems: Record<string, MenuItem[]>
  initialAllItems: MenuItem[]
}

export function parseMenuLanguage(value: string | undefined | null): Language {
  if (value === 'ku' || value === 'en' || value === 'ar') {
    return value
  }
  return 'en'
}

export function pickDefaultSection(sections: MenuSection[]): MenuSection | null {
  const sorted = sections
    .filter((section) => section.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  return sorted[0] ?? null
}

export function pickDefaultCategory(section: MenuSection | null): MenuCategory | null {
  if (!section) return null
  const sorted = section.categories
    .filter((category) => category.isActive)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  return sorted[0] ?? null
}

export function groupItemsByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  const grouped: Record<string, MenuItem[]> = {}
  for (const item of items) {
    if (!item.categoryId || !item.isActive) continue
    if (!grouped[item.categoryId]) {
      grouped[item.categoryId] = []
    }
    grouped[item.categoryId].push(item)
  }
  for (const categoryId of Object.keys(grouped)) {
    grouped[categoryId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }
  return grouped
}
