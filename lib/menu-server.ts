import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  type MenuItem,
  type MenuPageInitialData,
  type MenuSection,
  type MenuUiSettings,
  groupItemsByCategory,
  parseMenuLanguage,
  pickDefaultCategory,
  pickDefaultSection,
} from '@/lib/menu-types'

const DEFAULT_UI_SETTINGS: MenuUiSettings = {
  sectionTitleSize: 22,
  categoryTitleSize: 16,
  itemNameSize: 14,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 13,
  bottomNavCategorySize: 13,
  currency: 'IQD',
}

const ITEM_SELECT = {
  id: true,
  nameKu: true,
  nameEn: true,
  nameAr: true,
  descriptionKu: true,
  descriptionEn: true,
  descriptionAr: true,
  price: true,
  imageR2Url: true,
  imageMediaId: true,
  sortOrder: true,
  isActive: true,
  categoryId: true,
} as const

async function fetchUiSettings(restaurantId: string): Promise<MenuUiSettings> {
  try {
    const settings = await prisma.uiSettings.findUnique({
      where: { restaurantId },
    })

    if (!settings) {
      return DEFAULT_UI_SETTINGS
    }

    const currency =
      (settings as { currency?: string }).currency === 'USD' ? 'USD' : 'IQD'

    return {
      sectionTitleSize: settings.sectionTitleSize ?? 22,
      categoryTitleSize: settings.categoryTitleSize ?? 16,
      itemNameSize: settings.itemNameSize ?? 14,
      itemDescriptionSize: settings.itemDescriptionSize ?? 14,
      itemPriceSize: settings.itemPriceSize ?? 16,
      headerLogoSize: settings.headerLogoSize ?? 32,
      bottomNavSectionSize: (settings as { bottomNavSectionSize?: number }).bottomNavSectionSize ?? 13,
      bottomNavCategorySize: (settings as { bottomNavCategorySize?: number }).bottomNavCategorySize ?? 13,
      currency,
    }
  } catch {
    return DEFAULT_UI_SETTINGS
  }
}

async function fetchMenuStructure(restaurantId: string): Promise<{
  sections: MenuSection[]
  uiSettings: MenuUiSettings
}> {
  const [sectionsWithCategories, uiSettings] = await Promise.all([
    prisma.section.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      select: {
        id: true,
        nameKu: true,
        nameEn: true,
        nameAr: true,
        sortOrder: true,
        isActive: true,
        categories: {
          where: { isActive: true },
          select: {
            id: true,
            nameKu: true,
            nameEn: true,
            nameAr: true,
            sortOrder: true,
            isActive: true,
            imageR2Url: true,
            imageMediaId: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    fetchUiSettings(restaurantId),
  ])

  const sections: MenuSection[] = sectionsWithCategories.map((section) => ({
    ...section,
    categories: section.categories.map((category) => ({
      ...category,
      items: [],
    })),
  }))

  return { sections, uiSettings }
}

async function fetchSectionItems(
  restaurantId: string,
  sectionId: string
): Promise<MenuItem[]> {
  const items = await prisma.item.findMany({
    where: {
      restaurantId,
      isActive: true,
      category: {
        sectionId,
        isActive: true,
        restaurantId,
      },
    },
    select: ITEM_SELECT,
    orderBy: { sortOrder: 'asc' },
  })

  return items.map((item) => ({
    ...item,
    price: Number(item.price),
  }))
}

async function fetchPlatformFooterLogo(): Promise<string | null> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'platform-1' },
    select: { footerLogoR2Url: true },
  })
  return settings?.footerLogoR2Url ?? null
}

/**
 * Everything the menu page needs except the theme, which is served from the slug-scoped theme
 * cache that the surrounding layout already populates.
 */
export type MenuPageData = Omit<MenuPageInitialData, 'theme'>

async function loadMenuPageData(slug: string, langParam?: string | null): Promise<MenuPageData | null> {
  parseMenuLanguage(langParam ?? undefined)

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      nameKu: true,
      nameEn: true,
      nameAr: true,
      logoR2Url: true,
      logoMediaId: true,
      serviceChargePercent: true,
    },
  })

  if (!restaurant) {
    return null
  }

  const [{ sections, uiSettings }, footerLogoUrl] = await Promise.all([
    fetchMenuStructure(restaurant.id),
    fetchPlatformFooterLogo(),
  ])

  const defaultSection = pickDefaultSection(sections)
  const defaultCategory = pickDefaultCategory(defaultSection)

  let initialCategoryItems: Record<string, MenuItem[]> = {}
  let initialAllItems: MenuItem[] = []

  if (defaultSection) {
    initialAllItems = await fetchSectionItems(restaurant.id, defaultSection.id)
    initialCategoryItems = groupItemsByCategory(initialAllItems)
  }

  return {
    restaurant: {
      id: restaurant.id,
      nameKu: restaurant.nameKu,
      nameEn: restaurant.nameEn,
      nameAr: restaurant.nameAr,
      logoR2Url: restaurant.logoR2Url,
      logoMediaId: restaurant.logoMediaId,
      serviceChargePercent: restaurant.serviceChargePercent ?? 0,
    },
    sections,
    uiSettings,
    footerLogoUrl,
    initialSectionId: defaultSection?.id ?? null,
    initialCategoryId: defaultCategory?.id ?? null,
    initialCategoryItems,
    initialAllItems,
  }
}

export async function getMenuPageData(
  slug: string,
  langParam?: string | null
): Promise<MenuPageData | null> {
  const getCachedMenuPage = unstable_cache(
    () => loadMenuPageData(slug, langParam),
    [`menu-page-${slug}-${langParam || 'en'}`],
    {
      tags: [
        'menu',
        'menu-bootstrap',
        'menu-items',
        'theme',
        'platform-settings',
        `restaurant-slug-${slug}`,
      ],
      revalidate: 30,
    }
  )

  const cached = await getCachedMenuPage()
  if (cached) {
    return cached
  }

  // Never trust a cached miss — re-query live DB before returning 404.
  return loadMenuPageData(slug, langParam)
}
