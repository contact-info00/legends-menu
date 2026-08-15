import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

// Default values
const DEFAULT_SETTINGS = {
  sectionTitleSize: 22,
  categoryTitleSize: 16,
  itemNameSize: 14,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 13,
  bottomNavCategorySize: 13,
}

const SIZE_SELECT = {
  sectionTitleSize: true,
  categoryTitleSize: true,
  itemNameSize: true,
  itemDescriptionSize: true,
  itemPriceSize: true,
  headerLogoSize: true,
  bottomNavSectionSize: true,
  bottomNavCategorySize: true,
} as const

async function fetchUiSettings() {
  let uiSettings = DEFAULT_SETTINGS

  try {
    // Try to get from UiSettings first
    const settings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
      select: SIZE_SELECT,
    })

    if (settings) {
      uiSettings = {
        sectionTitleSize: settings.sectionTitleSize,
        categoryTitleSize: settings.categoryTitleSize,
        itemNameSize: settings.itemNameSize,
        itemDescriptionSize: settings.itemDescriptionSize,
        itemPriceSize: settings.itemPriceSize,
        headerLogoSize: settings.headerLogoSize,
        bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
        bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
      }
    } else {
      // Try FallbackSettings
      const fallbackSettings = await prisma.fallbackSettings.findUnique({
        where: { id: 'fallback-1' },
        select: SIZE_SELECT,
      })

      if (fallbackSettings) {
        uiSettings = {
          sectionTitleSize: fallbackSettings.sectionTitleSize ?? DEFAULT_SETTINGS.sectionTitleSize,
          categoryTitleSize: fallbackSettings.categoryTitleSize ?? DEFAULT_SETTINGS.categoryTitleSize,
          itemNameSize: fallbackSettings.itemNameSize ?? DEFAULT_SETTINGS.itemNameSize,
          itemDescriptionSize: fallbackSettings.itemDescriptionSize ?? DEFAULT_SETTINGS.itemDescriptionSize,
          itemPriceSize: fallbackSettings.itemPriceSize ?? DEFAULT_SETTINGS.itemPriceSize,
          headerLogoSize: fallbackSettings.headerLogoSize ?? DEFAULT_SETTINGS.headerLogoSize,
          bottomNavSectionSize: fallbackSettings.bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
          bottomNavCategorySize: fallbackSettings.bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
        }
      }
    }
  } catch (error) {
    console.warn('Could not load UI settings, using defaults:', error)
  }

  return uiSettings
}

/**
 * Global (non tenant-scoped) typography sizes rendered by the root layout on every request.
 * Cached behind the same tags the admin settings routes already invalidate, so admin edits
 * still take effect immediately instead of waiting out the revalidate window.
 */
const getCachedUiSettings = unstable_cache(fetchUiSettings, ['root-layout-ui-settings'], {
  tags: ['ui-settings', 'settings'],
  revalidate: 30,
})

export async function getUiSettings() {
  return getCachedUiSettings()
}

