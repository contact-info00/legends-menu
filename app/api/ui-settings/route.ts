import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default values (same as admin endpoint)
const DEFAULT_SETTINGS = {
  sectionTitleSize: 22,
  categoryTitleSize: 18,
  itemNameSize: 16,
  itemDescriptionSize: 14,
  itemPriceSize: 16,
  headerLogoSize: 32,
  bottomNavSectionSize: 18,
  bottomNavCategorySize: 15,
}

export async function GET() {
  try {
    // Public endpoint - no auth required
    // Check if uiSettings model exists in Prisma client
    if (!prisma.uiSettings) {
      console.error('UiSettings model not found in Prisma client. Returning defaults.')
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    const settings = await prisma.uiSettings.findUnique({
      where: { id: 'ui-settings-1' },
    })
    
    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    return NextResponse.json({
      sectionTitleSize: settings.sectionTitleSize,
      categoryTitleSize: settings.categoryTitleSize,
      itemNameSize: settings.itemNameSize,
      itemDescriptionSize: settings.itemDescriptionSize,
      itemPriceSize: settings.itemPriceSize,
      headerLogoSize: settings.headerLogoSize,
      bottomNavSectionSize: (settings as any).bottomNavSectionSize ?? DEFAULT_SETTINGS.bottomNavSectionSize,
      bottomNavCategorySize: (settings as any).bottomNavCategorySize ?? DEFAULT_SETTINGS.bottomNavCategorySize,
    })
  } catch (error: any) {
    console.error('Error fetching UI settings:', error)
    // If error is due to missing columns, return defaults
    if (error?.message?.includes('bottomNavSectionSize') || error?.message?.includes('bottomNavCategorySize') || error?.code === 'P2021') {
      console.warn('UiSettings columns missing, returning defaults. Run migration to add columns.')
    }
    // Return defaults on error
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

